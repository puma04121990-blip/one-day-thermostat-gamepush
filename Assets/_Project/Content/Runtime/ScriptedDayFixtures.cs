using System;
using System.Collections.Generic;
using System.Linq;

namespace OneDayThermostat.Content
{
    [Serializable]
    public sealed class ScriptedScenarioStep
    {
        public string ScenarioId = string.Empty;
        public string RouteId = string.Empty;
        public float Openness;
        public string ExpectedArchiveKey = string.Empty;
        public string ExpectedOutcomeKey = string.Empty;
        public int MaxTicksToWarning = 24;
        public int MaxTicksToResolution = 18;
    }

    /// <summary>
    /// A deterministic player-facing walkthrough contract. It documents and tests
    /// the authored sequence, but never replaces EventDirector as the authority
    /// that advances a live world.
    /// </summary>
    [Serializable]
    public sealed class ScriptedDayFixture
    {
        public string Id = string.Empty;
        public string ExpectedFinalOutcomeKey = string.Empty;
        public readonly List<ScriptedScenarioStep> Steps = new List<ScriptedScenarioStep>();

        public bool IsSafe(IReadOnlyList<ScenarioDefinition> scenarios, out string reason)
        {
            if (string.IsNullOrWhiteSpace(Id) || string.IsNullOrWhiteSpace(ExpectedFinalOutcomeKey) || Steps.Count == 0)
            {
                reason = "fixture.error.missing_id_or_outcome";
                return false;
            }
            if (scenarios == null || scenarios.Count == 0)
            {
                reason = "fixture.error.missing_scenarios";
                return false;
            }

            var known = new Dictionary<string, ScenarioDefinition>();
            foreach (var scenario in scenarios)
            {
                if (scenario == null || string.IsNullOrWhiteSpace(scenario.Id) || known.ContainsKey(scenario.Id))
                {
                    reason = "fixture.error.invalid_scenario_set";
                    return false;
                }
                known.Add(scenario.Id, scenario);
            }
            var usedScenarios = new HashSet<string>();
            foreach (var step in Steps)
            {
                if (step == null || string.IsNullOrWhiteSpace(step.ScenarioId) || string.IsNullOrWhiteSpace(step.RouteId) || string.IsNullOrWhiteSpace(step.ExpectedArchiveKey) || string.IsNullOrWhiteSpace(step.ExpectedOutcomeKey))
                {
                    reason = "fixture.error.incomplete_step";
                    return false;
                }
                if (!known.TryGetValue(step.ScenarioId, out var scenario) || !scenario.IsFair(out _))
                {
                    reason = "fixture.error.unknown_or_unfair_scenario:" + step.ScenarioId;
                    return false;
                }
                if (!scenario.Routes.Any(x => x.RouteId == step.RouteId && x.PreservesResidentAgency))
                {
                    reason = "fixture.error.unknown_or_non_agency_route:" + step.RouteId;
                    return false;
                }
                if (step.Openness < 0f || step.Openness > 1f || step.MaxTicksToWarning <= 0 || step.MaxTicksToResolution <= 0)
                {
                    reason = "fixture.error.invalid_bound:" + step.ScenarioId;
                    return false;
                }
                usedScenarios.Add(step.ScenarioId);
            }

            if (usedScenarios.Count != Steps.Count)
            {
                reason = "fixture.error.repeated_scenario";
                return false;
            }
            reason = string.Empty;
            return true;
        }
    }

    public static class ScriptedDayFixtureCatalog
    {
        public static IReadOnlyList<ScriptedDayFixture> Create() => new[] { CarefulThreeChainDay() };

        public static ScriptedDayFixture CarefulThreeChainDay()
        {
            var fixture = new ScriptedDayFixture
            {
                Id = "fixture.careful_three_chain_day",
                ExpectedFinalOutcomeKey = "baseline.day_complete"
            };
            fixture.Steps.Add(new ScriptedScenarioStep
            {
                ScenarioId = "prologue.open_door",
                RouteId = "route.quiet_middle",
                Openness = .56f,
                ExpectedArchiveKey = "archive.threshold_route",
                ExpectedOutcomeKey = "archive.threshold_route"
            });
            fixture.Steps.Add(new ScriptedScenarioStep
            {
                ScenarioId = "event.silver_corridor",
                RouteId = "route.drain_quiet",
                Openness = .56f,
                ExpectedArchiveKey = "archive.silver_corridor",
                ExpectedOutcomeKey = "archive.silver_corridor"
            });
            fixture.Steps.Add(new ScriptedScenarioStep
            {
                ScenarioId = "event.blackout_return",
                RouteId = "route.quiet_middle",
                Openness = .56f,
                ExpectedArchiveKey = "archive.staged_return",
                ExpectedOutcomeKey = "archive.staged_return"
            });
            return fixture;
        }
    }
}
