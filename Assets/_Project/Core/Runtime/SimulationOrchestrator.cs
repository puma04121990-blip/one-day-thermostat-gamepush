using System;
using System.Collections.Generic;
using System.Linq;
using OneDayThermostat.Gameplay.Automation;
using OneDayThermostat.Gameplay.Climate;
using OneDayThermostat.Gameplay.Progression;

namespace OneDayThermostat.Core
{
    public sealed class SimulationOrchestrator
    {
        public const float TickSeconds = .2f;
        private readonly ClimateSystem _climate = new ClimateSystem();
        private readonly ComponentStressSystem _stress = new ComponentStressSystem();
        private readonly ResidentRhythmSystem _residents = new ResidentRhythmSystem();
        private readonly EventDirector _events = new EventDirector();
        private readonly ServiceFollowUpSystem _service = new ServiceFollowUpSystem();
        private readonly AchievementProgressionSystem _progression = new AchievementProgressionSystem();
        private readonly DiagnosticReasoning _diagnostics = new DiagnosticReasoning();
        private readonly AutomationEvaluator _automation = new AutomationEvaluator(new SafetyGovernor());
        private readonly FirmwareModifierCatalog _configuration = new FirmwareModifierCatalog();
        private readonly Dictionary<string, PolicyRuleDefinition> _rules = new Dictionary<string, PolicyRuleDefinition>();

        public SimulationOrchestrator()
        {
            _rules["policy.surface_shade_until_falling"] = new PolicyRuleDefinition
            {
                Id = "policy.surface_shade_until_falling",
                When = new ZoneAboveCondition { ZoneId = "west_wall", Metric = ZoneMetric.SurfaceHeat, Threshold = .68f },
                If = new ComponentStageAtLeastCondition { ComponentId = "component.network_main", MinimumStage = ComponentStage.Elevated },
                Then = new SimulationCommand { Kind = CommandKind.SetRoute, TargetId = "route.quiet_middle", Value = .42f, Source = "policy.surface_shade_until_falling" },
                Until = new ZoneAboveCondition { ZoneId = "west_wall", Metric = ZoneMetric.SurfaceHeat, Threshold = .73f },
                ShowKey = "policy.surface_memory.show",
                TradeoffKey = "policy.surface_memory.cost.slower_response"
            };
        }

        public event Action<SimulationSnapshot> SnapshotPublished;

        public void Enqueue(SimulationWorld world, SimulationCommand command)
        {
            command.SubmittedAtTick = world.Tick;
            world.PendingCommands.Add(command);
        }

        public ConfigurationPreviewDTO PreviewFirmware(SimulationWorld world, string firmwareId) => _configuration.PreviewFirmware(world, firmwareId);

        public ConfigurationPreviewDTO PreviewModifier(SimulationWorld world, string modifierId, ModifierChannel channel) => _configuration.PreviewModifier(world, modifierId, channel);

        public PolicyPreviewDTO PreviewPolicy(SimulationWorld world, string ruleId)
        {
            if (!_rules.TryGetValue(ruleId, out var rule))
            {
                return new PolicyPreviewDTO { Status = PolicyDecisionStatus.Blocked, RuleId = ruleId, ReasonKey = "policy.error.unknown_rule", AlternativeKey = "policy.alternative.select_known_rule", StaleAtTick = world.Tick + 1 };
            }
            var context = new AutomationContext { Snapshot = world.CreateSnapshot(), ExplicitCommands = world.PendingCommands.ToArray() };
            return _automation.Evaluate(context, rule);
        }

        public SimulationSnapshot Step(SimulationWorld world)
        {
            // The sole authoritative order. Presentation and platform callbacks only consume the result.
            _climate.Step(world, TickSeconds);
            _stress.Step(world, TickSeconds);
            _residents.Step(world, TickSeconds);
            _events.Step(world, TickSeconds);
            _service.Step(world, TickSeconds);
            EvaluateAndQueuePolicy(world);
            CommitCommands(world);
            _progression.Step(world, TickSeconds);
            _diagnostics.Update(world, _configuration);
            world.Tick++;
            world.DayProgress = (world.DayProgress + .0025f) % 1f;
            var snapshot = world.CreateSnapshot();
            SnapshotPublished?.Invoke(snapshot);
            return snapshot;
        }

        private void EvaluateAndQueuePolicy(SimulationWorld world)
        {
            if (!world.Policy.ActiveRuleEnabled || string.IsNullOrWhiteSpace(world.Policy.ActiveRuleId)) return;
            var preview = PreviewPolicy(world, world.Policy.ActiveRuleId);
            world.Policy.Log.Add(new PolicyLogEntry
            {
                Tick = world.Tick,
                RuleId = preview.RuleId,
                Status = preview.Status,
                ReasonKey = preview.ReasonKey,
                AlternativeKey = preview.AlternativeKey
            });
            if (preview.Status == PolicyDecisionStatus.Valid)
            {
                var candidate = preview.Candidate;
                candidate.Source = "policy";
                candidate.SubmittedAtTick = world.Tick;
                world.PendingCommands.Add(candidate);
            }
            else if (preview.Status == PolicyDecisionStatus.Blocked)
            {
                world.Archive.UnresolvedCosts.Add(preview.ReasonKey);
            }
        }

        private void CommitCommands(SimulationWorld world)
        {
            foreach (var command in world.PendingCommands.OrderBy(x => Priority(x.Kind)).ThenBy(x => x.SubmittedAtTick).ToArray())
            {
                var adjusted = command;
                _configuration.ApplyRouteModifier(world, ref adjusted);
                switch (adjusted.Kind)
                {
                    case CommandKind.SetRoute:
                        if (world.Routes.TryGetValue(adjusted.TargetId, out var route) && route.IsAvailable)
                        {
                            route.Openness = Clamp01(adjusted.Value);
                        }
                        break;
                    case CommandKind.Tune:
                        if (world.Zones.TryGetValue(adjusted.TargetId, out var zone)) zone.AirTemperature = Clamp01(zone.AirTemperature + adjusted.Value * .05f);
                        break;
                    case CommandKind.Pulse:
                        if (world.Components.Values.Any(x => x.Stage == ComponentStage.Protective)) break;
                        if (world.Zones.TryGetValue(adjusted.TargetId, out var pulseZone))
                        {
                            pulseZone.AirTemperature = Clamp01(pulseZone.AirTemperature + adjusted.Value * .08f);
                            pulseZone.ActiveLoad = Clamp01(pulseZone.ActiveLoad + adjusted.Value * .18f);
                        }
                        break;
                    case CommandKind.Isolate:
                        if (world.Routes.TryGetValue(adjusted.TargetId, out var isolationRoute)) isolationRoute.IsAvailable = false;
                        break;
                    case CommandKind.Recover:
                        if (world.Components.TryGetValue(adjusted.TargetId, out var component))
                        {
                            component.Wear = Clamp01(component.Wear - .06f);
                            component.RecoveryProgress = Clamp01(component.RecoveryProgress + .18f);
                        }
                        break;
                    case CommandKind.CompleteServiceFollowUp:
                        _service.Complete(world, adjusted.TargetId);
                        break;
                    case CommandKind.CommitPolicy:
                        world.Policy.ActiveRuleId = adjusted.TargetId;
                        world.Policy.ActiveRuleEnabled = true;
                        break;
                    case CommandKind.CancelPolicy:
                        world.Policy.ActiveRuleEnabled = false;
                        break;
                    case CommandKind.SelectFirmware:
                        if (_configuration.IsKnownFirmware(adjusted.TargetId)) RecordConfiguration(world, adjusted, "configuration.firmware_selected", () => world.Policy.FirmwareId = adjusted.TargetId);
                        break;
                    case CommandKind.SelectSensorModifier:
                        if (_configuration.IsKnownModifier(adjusted.TargetId, ModifierChannel.Sensor)) RecordConfiguration(world, adjusted, "configuration.sensor_modifier_selected", () => world.Policy.SensorModifierId = adjusted.TargetId);
                        break;
                    case CommandKind.SelectRouteModifier:
                        if (_configuration.IsKnownModifier(adjusted.TargetId, ModifierChannel.Route)) RecordConfiguration(world, adjusted, "configuration.route_modifier_selected", () => world.Policy.RouteModifierId = adjusted.TargetId);
                        break;
                }
            }
            world.PendingCommands.Clear();
        }

        private static void RecordConfiguration(SimulationWorld world, SimulationCommand command, string reasonKey, Action apply)
        {
            apply();
            world.Policy.Log.Add(new PolicyLogEntry
            {
                Tick = world.Tick,
                RuleId = command.TargetId,
                Status = PolicyDecisionStatus.Valid,
                ReasonKey = reasonKey,
                AlternativeKey = string.Empty
            });
        }

        private static int Priority(CommandKind kind)
        {
            return kind == CommandKind.Isolate ? 0 : kind == CommandKind.Recover || kind == CommandKind.CompleteServiceFollowUp ? 1 : kind == CommandKind.SetRoute ? 2 : kind == CommandKind.Pulse ? 3 : kind == CommandKind.SelectFirmware || kind == CommandKind.SelectSensorModifier || kind == CommandKind.SelectRouteModifier ? 4 : 5;
        }

        private static float Clamp01(float value) => Math.Max(0f, Math.Min(1f, value));
    }
}
