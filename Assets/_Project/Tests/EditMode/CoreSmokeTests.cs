using System;
using OneDayThermostat.Content;
using OneDayThermostat.Core;
using OneDayThermostat.Gameplay.Automation;

namespace OneDayThermostat.Tests
{
    public static class CoreSmokeTests
    {
        public static int Main()
        {
            try
            {
                DeterministicRouteOutcome();
                PolicyGovernorBlocksUnsafePulse();
                SaveMapperRoundTripPreservesAuthority();
                CampaignProgressionReachesStagedReturnBaseline();
                FirmwareModifiersAreWhitelistedAndPreviewedBeforeCommit();
                ServiceFollowUpsAreRecoverableAndPersisted();
                CanonicalScenarioCatalogMeetsFairnessContract();
                Console.WriteLine("CORE_SMOKE_TESTS: PASS");
                return 0;
            }
            catch (Exception exception)
            {
                Console.Error.WriteLine("CORE_SMOKE_TESTS: FAIL\n" + exception);
                return 1;
            }
        }

        private static void DeterministicRouteOutcome()
        {
            var first = RunScenario();
            var second = RunScenario();
            Assert(first.entranceTemperature == second.entranceTemperature, "seed + commands must produce deterministic entrance state");
            Assert(first.branchStage == second.branchStage, "seed + commands must produce deterministic wear stage");
            Assert(first.phase == second.phase, "seed + commands must produce deterministic event phase");
            Assert(first.quietRoute > .28f, "quiet route command should commit");
        }

        private static (float entranceTemperature, ComponentStage branchStage, EventPhase phase, float quietRoute) RunScenario()
        {
            var world = SimulationWorld.CreatePrologue(7);
            var orchestrator = new SimulationOrchestrator();
            orchestrator.Enqueue(world, new SimulationCommand { Kind = CommandKind.SetRoute, TargetId = "route.direct_lower", Value = .44f, Source = "test" });
            orchestrator.Enqueue(world, new SimulationCommand { Kind = CommandKind.SetRoute, TargetId = "route.quiet_middle", Value = .36f, Source = "test" });
            for (var index = 0; index < 18; index++) orchestrator.Step(world);
            return (world.Zone("entrance").AirTemperature, world.Component("component.branch_26").Stage, world.Event.Phase, world.Route("route.quiet_middle").Openness);
        }

        private static void PolicyGovernorBlocksUnsafePulse()
        {
            var world = SimulationWorld.CreatePrologue(13);
            world.Component("component.branch_26").Stage = ComponentStage.Protective;
            var rule = new PolicyRuleDefinitionForTest().CreatePulseRule();
            var governor = new OneDayThermostat.Gameplay.Automation.SafetyGovernor();
            var context = new OneDayThermostat.Gameplay.Automation.AutomationContext { Snapshot = world.CreateSnapshot() };
            var preview = governor.Validate(context, rule);
            Assert(preview.Status == PolicyDecisionStatus.Blocked, "protective component must block unsafe pulse");
            Assert(preview.AlternativeKey == "policy.alternative.recover_or_isolate", "blocked policy must show a safe alternative");
        }

        private static void CanonicalScenarioCatalogMeetsFairnessContract()
        {
            foreach (var scenario in CanonicalScenarioCatalog.Create())
            {
                Assert(scenario.IsFair(out var reason), $"scenario {scenario.Id} must satisfy fairness contract: {reason}");
                Assert(scenario.Routes.TrueForAll(route => route.PreservesResidentAgency), $"scenario {scenario.Id} must preserve resident agency");
            }
        }

        private static void SaveMapperRoundTripPreservesAuthority()
        {
            var world = SimulationWorld.CreatePrologue(19);
            var orchestrator = new SimulationOrchestrator();
            orchestrator.Enqueue(world, new SimulationCommand { Kind = CommandKind.SetRoute, TargetId = "route.quiet_middle", Value = .38f, Source = "test" });
            for (var index = 0; index < 5; index++) orchestrator.Step(world);
            var dto = SaveMapper.ToDto(world, "slot_test", "test");
            var restored = SaveMapper.ToWorld(dto);
            Assert(restored.Tick == world.Tick, "save round-trip should preserve simulation tick");
            Assert(restored.Route("route.quiet_middle").Openness == world.Route("route.quiet_middle").Openness, "save round-trip should preserve committed route");
            Assert(restored.Event.Phase == world.Event.Phase, "save round-trip should preserve event phase");
            Assert(restored.Event.CampaignIndex == world.Event.CampaignIndex, "save round-trip should preserve campaign index");
            Assert(restored.Event.LastOutcomeKey == world.Event.LastOutcomeKey, "save round-trip should preserve the player-facing event outcome");
        }

        private static void CampaignProgressionReachesStagedReturnBaseline()
        {
            var world = SimulationWorld.CreatePrologue(31);
            var orchestrator = new SimulationOrchestrator();

            Step(world, orchestrator, 5);
            SetRoute(world, orchestrator, "route.quiet_middle", .56f);
            Step(world, orchestrator, 16);
            Assert(world.Event.ActiveChainId == "event.silver_corridor", "careful threshold route should advance to silver corridor");
            Assert(world.Event.Phase == EventPhase.Warning || world.Event.Phase == EventPhase.Foreshadow, "silver corridor should begin through visible foreshadow/warning state");

            SetRoute(world, orchestrator, "route.drain_quiet", .56f);
            Step(world, orchestrator, 18);
            Assert(world.Event.ActiveChainId == "event.blackout_return", "careful drain route should advance to staged blackout return");

            SetRoute(world, orchestrator, "route.quiet_middle", .56f);
            Step(world, orchestrator, 20);
            Assert(world.Event.Phase == EventPhase.Cooldown, "staged return should finish in a recoverable day-complete baseline");
            Assert(world.Archive.UnlockedEntries.Contains("archive.threshold_route"), "threshold aftermath should be archived");
            Assert(world.Archive.UnlockedEntries.Contains("archive.silver_corridor"), "silver corridor aftermath should be archived");
            Assert(world.Archive.UnlockedEntries.Contains("archive.staged_return"), "staged return aftermath should be archived");
            Assert(world.Archive.UnlockedEntries.Contains("archive.day_complete"), "complete day should create a reflective archive entry");
            Assert(world.Archive.EndOfDayReviewAvailable, "recoverable day completion should offer an end-of-day review");
            Assert(world.Archive.EndOfDayReviewKey == "review.day.stewardship_complete", "careful completion should communicate stewardship baseline");
        }

        private static void ServiceFollowUpsAreRecoverableAndPersisted()
        {
            var world = SimulationWorld.CreatePrologue(47);
            var orchestrator = new SimulationOrchestrator();
            world.Component("component.branch_26").Wear = .54f;
            world.Archive.UnresolvedCosts.Add("cost.branch_26_resonance");

            orchestrator.Step(world);
            Assert(world.Archive.ServiceFollowUps.Count == 1, "visible unresolved cost should materialize one service follow-up");
            var followUp = world.Archive.ServiceFollowUps[0];
            Assert(followUp.ComponentId == "component.branch_26", "service follow-up should identify material component rather than a resident");
            var wearBeforeService = world.Component("component.branch_26").Wear;

            orchestrator.Enqueue(world, new SimulationCommand { Kind = CommandKind.CompleteServiceFollowUp, TargetId = followUp.Id, Source = "test" });
            orchestrator.Step(world);
            Assert(followUp.IsResolved, "explicit service action should resolve the selected follow-up");
            Assert(world.Component("component.branch_26").Wear < wearBeforeService, "service action should produce bounded component recovery");
            Assert(world.Archive.UnlockedEntries.Contains("service.outcome.branch_rebalanced"), "service action should leave a player-facing Archive outcome");

            var restored = SaveMapper.ToWorld(SaveMapper.ToDto(world, "service_slot", "test"));
            Assert(restored.Archive.ServiceFollowUps.Count == 1 && restored.Archive.ServiceFollowUps[0].IsResolved, "service follow-up completion must survive save round-trip");
        }

        private static void FirmwareModifiersAreWhitelistedAndPreviewedBeforeCommit()
        {
            var world = SimulationWorld.CreatePrologue(43);
            var orchestrator = new SimulationOrchestrator();

            var preview = orchestrator.PreviewFirmware(world, "firmware.air_first");
            Assert(preview.Status == PolicyDecisionStatus.Valid, "known firmware must preview as a valid safe selection");
            Assert(world.Policy.FirmwareId == "firmware.surface_memory", "preview must not mutate authoritative policy state");
            Assert(orchestrator.PreviewFirmware(world, "firmware.unknown").Status == PolicyDecisionStatus.Blocked, "unknown firmware must be blocked by the whitelist");
            Assert(orchestrator.PreviewModifier(world, "modifier.direct_boost", ModifierChannel.Sensor).Status == PolicyDecisionStatus.Blocked, "modifier channel mismatch must be blocked");

            orchestrator.Enqueue(world, new SimulationCommand { Kind = CommandKind.SelectFirmware, TargetId = "firmware.air_first", Source = "test" });
            orchestrator.Enqueue(world, new SimulationCommand { Kind = CommandKind.SelectSensorModifier, TargetId = "modifier.moisture_stipple", Source = "test" });
            orchestrator.Enqueue(world, new SimulationCommand { Kind = CommandKind.SelectRouteModifier, TargetId = "modifier.direct_boost", Source = "test" });
            orchestrator.Step(world);
            Assert(world.Policy.FirmwareId == "firmware.air_first", "committed firmware should be authoritative after the next tick");
            Assert(world.Policy.SensorModifierId == "modifier.moisture_stipple", "committed sensor modifier should be authoritative after the next tick");
            Assert(world.Policy.RouteModifierId == "modifier.direct_boost", "committed route modifier should be authoritative after the next tick");
            Assert(world.Policy.Log.Count >= 3, "configuration commits should leave a compact policy log trail");

            orchestrator.Enqueue(world, new SimulationCommand { Kind = CommandKind.SetRoute, TargetId = "route.direct_lower", Value = .72f, Source = "test" });
            orchestrator.Step(world);
            Assert(world.Route("route.direct_lower").Openness > .80f, "direct boost must have a visible bounded route effect");
            Assert(world.Route("route.direct_lower").Openness <= .821f, "direct boost must remain bounded and avoid unscaled tuning");

            orchestrator.Enqueue(world, new SimulationCommand { Kind = CommandKind.SelectFirmware, TargetId = "firmware.unknown", Source = "test" });
            orchestrator.Step(world);
            Assert(world.Policy.FirmwareId == "firmware.air_first", "unknown firmware command must not replace the active configuration");
        }

        private static void SetRoute(SimulationWorld world, SimulationOrchestrator orchestrator, string routeId, float openness)
        {
            orchestrator.Enqueue(world, new SimulationCommand { Kind = CommandKind.SetRoute, TargetId = routeId, Value = openness, Source = "test" });
        }

        private static void Step(SimulationWorld world, SimulationOrchestrator orchestrator, int count)
        {
            for (var index = 0; index < count; index++) orchestrator.Step(world);
        }

        private static void Assert(bool condition, string message)
        {
            if (!condition) throw new InvalidOperationException(message);
        }
    }

    internal sealed class PolicyRuleDefinitionForTest
    {
        public OneDayThermostat.Gameplay.Automation.PolicyRuleDefinition CreatePulseRule()
        {
            return new OneDayThermostat.Gameplay.Automation.PolicyRuleDefinition
            {
                Id = "test.unsafe_pulse",
                When = new OneDayThermostat.Gameplay.Automation.ZoneAboveCondition { ZoneId = "west_wall", Metric = OneDayThermostat.Gameplay.Automation.ZoneMetric.SurfaceHeat, Threshold = .1f },
                If = new OneDayThermostat.Gameplay.Automation.ZoneAboveCondition { ZoneId = "west_wall", Metric = OneDayThermostat.Gameplay.Automation.ZoneMetric.SurfaceHeat, Threshold = .1f },
                Then = new SimulationCommand { Kind = CommandKind.Pulse, TargetId = "west_wall", Value = 1f, Source = "test" },
                Until = new OneDayThermostat.Gameplay.Automation.ZoneAboveCondition { ZoneId = "west_wall", Metric = OneDayThermostat.Gameplay.Automation.ZoneMetric.SurfaceHeat, Threshold = .99f },
                ShowKey = "test.show",
                TradeoffKey = "test.cost"
            };
        }
    }
}
