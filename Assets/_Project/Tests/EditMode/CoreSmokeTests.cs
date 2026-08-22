using System;
using OneDayThermostat.Content;
using OneDayThermostat.Core;

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
