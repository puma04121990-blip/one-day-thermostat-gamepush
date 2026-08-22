using System;
using System.Collections.Generic;
using System.Linq;
using OneDayThermostat.Core;

namespace OneDayThermostat.Gameplay.Automation
{
    public sealed class AutomationContext
    {
        public SimulationSnapshot Snapshot = new SimulationSnapshot();
        public IReadOnlyList<SimulationCommand> ExplicitCommands = Array.Empty<SimulationCommand>();
    }

    public abstract class PolicyCondition
    {
        public abstract bool Evaluate(AutomationContext context);
        public abstract string DescriptionKey { get; }
    }

    public sealed class ComponentStageAtLeastCondition : PolicyCondition
    {
        public string ComponentId = string.Empty;
        public ComponentStage MinimumStage;
        public override string DescriptionKey => "policy.condition.component_stage";
        public override bool Evaluate(AutomationContext context)
        {
            return context.Snapshot.Components.Any(x => x.Id == ComponentId && x.Stage >= MinimumStage);
        }
    }

    public sealed class ZoneAboveCondition : PolicyCondition
    {
        public string ZoneId = string.Empty;
        public float Threshold;
        public ZoneMetric Metric;
        public override string DescriptionKey => "policy.condition.zone_band";
        public override bool Evaluate(AutomationContext context)
        {
            var zone = context.Snapshot.Zones.FirstOrDefault(x => x.Id == ZoneId);
            if (zone == null) return false;
            var value = Metric == ZoneMetric.SurfaceHeat ? zone.SurfaceHeat : Metric == ZoneMetric.Moisture ? zone.Moisture : Metric == ZoneMetric.ActiveLoad ? zone.ActiveLoad : zone.AirTemperature;
            return value >= Threshold;
        }
    }

    public enum ZoneMetric { AirTemperature, Moisture, ActiveLoad, SurfaceHeat }

    public sealed class PolicyRuleDefinition
    {
        public string Id = string.Empty;
        public PolicyCondition When = null;
        public PolicyCondition If = null;
        public SimulationCommand Then;
        public PolicyCondition Until = null;
        public string ShowKey = string.Empty;
        public string TradeoffKey = string.Empty;

        public bool IsWellFormed(out string errorKey)
        {
            if (When == null || If == null || Until == null || string.IsNullOrWhiteSpace(Then.TargetId) || string.IsNullOrWhiteSpace(ShowKey) || string.IsNullOrWhiteSpace(TradeoffKey))
            {
                errorKey = "policy.error.missing_until_or_show";
                return false;
            }
            errorKey = string.Empty;
            return true;
        }
    }

    public sealed class PolicyPreviewDTO
    {
        public PolicyDecisionStatus Status;
        public string RuleId = string.Empty;
        public string ReasonKey = string.Empty;
        public string AlternativeKey = string.Empty;
        public string TradeoffSummaryKey = string.Empty;
        public string StopConditionKey = string.Empty;
        public string AffectedRhythmMarker = string.Empty;
        public long StaleAtTick;
        public SimulationCommand Candidate;
    }

    public sealed class SafetyGovernor
    {
        public PolicyPreviewDTO Validate(AutomationContext context, PolicyRuleDefinition rule)
        {
            if (!rule.IsWellFormed(out var validationError))
            {
                return Block(rule, validationError, "policy.alternative.add_until", context.Snapshot.Tick);
            }

            if (!rule.When.Evaluate(context) || !rule.If.Evaluate(context))
            {
                return new PolicyPreviewDTO
                {
                    Status = PolicyDecisionStatus.Suggested,
                    RuleId = rule.Id,
                    ReasonKey = "policy.awaiting_context",
                    TradeoffSummaryKey = rule.TradeoffKey,
                    StopConditionKey = rule.Until.DescriptionKey,
                    StaleAtTick = context.Snapshot.Tick + 1
                };
            }

            if (rule.Until.Evaluate(context))
            {
                return new PolicyPreviewDTO
                {
                    Status = PolicyDecisionStatus.Superseded,
                    RuleId = rule.Id,
                    ReasonKey = "policy.stop_condition_met",
                    TradeoffSummaryKey = rule.TradeoffKey,
                    StopConditionKey = rule.Until.DescriptionKey,
                    StaleAtTick = context.Snapshot.Tick + 1
                };
            }

            if (context.Snapshot.Components.Any(x => x.Stage == ComponentStage.Protective) && rule.Then.Kind == CommandKind.Pulse)
            {
                return Block(rule, "governor.protective_lockout", "policy.alternative.recover_or_isolate", context.Snapshot.Tick);
            }

            if (context.ExplicitCommands.Any(x => x.TargetId == rule.Then.TargetId && x.Kind == CommandKind.SetRoute))
            {
                return Block(rule, "governor.manual_command_precedence", "policy.alternative.wait_for_manual_route", context.Snapshot.Tick);
            }

            return new PolicyPreviewDTO
            {
                Status = PolicyDecisionStatus.Valid,
                RuleId = rule.Id,
                ReasonKey = rule.ShowKey,
                TradeoffSummaryKey = rule.TradeoffKey,
                StopConditionKey = rule.Until.DescriptionKey,
                AffectedRhythmMarker = "rhythm.quiet_window",
                StaleAtTick = context.Snapshot.Tick + 1,
                Candidate = rule.Then
            };
        }

        private static PolicyPreviewDTO Block(PolicyRuleDefinition rule, string reason, string alternative, long tick)
        {
            return new PolicyPreviewDTO
            {
                Status = PolicyDecisionStatus.Blocked,
                RuleId = rule.Id,
                ReasonKey = reason,
                AlternativeKey = alternative,
                TradeoffSummaryKey = rule.TradeoffKey,
                StopConditionKey = rule.Until != null ? rule.Until.DescriptionKey : "policy.condition.missing",
                StaleAtTick = tick + 1
            };
        }
    }

    public sealed class AutomationEvaluator
    {
        private readonly SafetyGovernor _governor;
        public AutomationEvaluator(SafetyGovernor governor) => _governor = governor;

        public PolicyPreviewDTO Evaluate(AutomationContext context, PolicyRuleDefinition rule)
        {
            return _governor.Validate(context, rule);
        }
    }

    public sealed class DiagnosticReasoning
    {
        public void Update(SimulationWorld world, FirmwareModifierCatalog configuration = null)
        {
            world.LatestReasons.Clear();
            world.LatestPreviews.Clear();
            var entrance = world.Zone("entrance");
            var branch = world.Component("component.branch_26");
            var kitchen = world.Zone("lera_kitchen");

            world.LatestReasons.Add(new DiagnosticReason { Key = "reason.external_air_at_threshold", ZoneId = "entrance", Weight = 1f - entrance.AirTemperature });
            world.LatestReasons.Add(new DiagnosticReason { Key = branch.TopExplanationA, ZoneId = "sasha_room", Weight = branch.RecentStress });
            if (kitchen.Moisture > .32f) world.LatestReasons.Add(new DiagnosticReason { Key = "reason.moisture_residual", ZoneId = "lera_kitchen", Weight = kitchen.Moisture });
            configuration?.TuneReasons(world);
            world.LatestReasons.Sort((a, b) => b.Weight.CompareTo(a.Weight));
            if (world.LatestReasons.Count > 2) world.LatestReasons.RemoveRange(2, world.LatestReasons.Count - 2);

            AddPreview(world, "route.direct_lower", "route.direct.benefit.fast_threshold_warmth", "route.direct.cost.branch_26_resonance");
            AddPreview(world, "route.quiet_middle", "route.quiet.benefit.preserve_quiet_window", "route.quiet.cost.slower_threshold_recovery");
        }

        private static void AddPreview(SimulationWorld world, string routeId, string benefit, string cost)
        {
            var route = world.Route(routeId);
            world.LatestPreviews.Add(new RoutePreview
            {
                RouteId = routeId,
                BenefitKey = benefit,
                CostKey = cost,
                ExpectedLoadDelta = route.LoadWeight * route.Openness,
                ExpectedWearDelta = route.NoiseWeight * route.Openness,
                ExpectedRhythmPressureDelta = route.NoiseWeight * route.Openness - (routeId == "route.quiet_middle" ? .10f : 0f)
            });
        }
    }
}
