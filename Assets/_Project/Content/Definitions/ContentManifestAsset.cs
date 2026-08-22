using System;
using System.Collections.Generic;
using System.Linq;
using OneDayThermostat.Content;
using OneDayThermostat.Presentation.Runtime;
using UnityEngine;

namespace OneDayThermostat.Content.Definitions
{
    [CreateAssetMenu(menuName = "One Day Thermostat/Content Manifest", fileName = "ContentManifest_")]
    public sealed class ContentManifestAsset : ScriptableObject
    {
        [SerializeField] private List<ScenarioDefinitionAsset> scenarios = new List<ScenarioDefinitionAsset>();
        [SerializeField] private List<ScriptedDayFixtureAsset> scriptedDayFixtures = new List<ScriptedDayFixtureAsset>();
        [SerializeField] private List<FirmwareDefinitionAsset> firmware = new List<FirmwareDefinitionAsset>();
        [SerializeField] private List<ModifierDefinitionAsset> modifiers = new List<ModifierDefinitionAsset>();

        public bool IsSafe(out string error)
        {
            error = string.Empty;
            if (!HaveUniqueIds(scenarios.Where(x => x != null).Select(x => x.StableId), out error)) return false;
            if (!HaveUniqueIds(scriptedDayFixtures.Where(x => x != null).Select(x => x.StableId), out error)) return false;
            if (!HaveUniqueIds(firmware.Where(x => x != null).Select(x => x.StableId), out error)) return false;
            if (!HaveUniqueIds(modifiers.Where(x => x != null).Select(x => x.StableId), out error)) return false;
            foreach (var scenario in scenarios)
            {
                if (scenario == null) { error = "content.error.unsafe_scenario"; return false; }
                string scenarioError;
                if (!scenario.IsSafe(out scenarioError)) { error = scenarioError; return false; }
            }
            var runtimeScenarios = scenarios.Where(x => x != null).Select(x => x.ToRuntimeDefinition()).ToArray();
            foreach (var fixture in scriptedDayFixtures)
            {
                if (fixture == null) { error = "content.error.unsafe_fixture"; return false; }
                string fixtureError;
                if (!fixture.IsSafe(runtimeScenarios, out fixtureError)) { error = fixtureError; return false; }
            }
            if (firmware.Any(x => x == null || !x.IsSafe)) { error = "content.error.unsafe_firmware"; return false; }
            if (modifiers.Any(x => x == null || !x.IsSafe)) { error = "content.error.unsafe_modifier"; return false; }
            foreach (var key in CollectSemanticKeys())
            {
                if (!IsSemanticKey(key)) { error = "content.error.invalid_semantic_key:" + key; return false; }
                if (!LocalizationProvider.HasAny(key)) { error = "content.error.missing_localization:" + key; return false; }
            }
            return true;
        }

        public IEnumerable<string> CollectSemanticKeys()
        {
            foreach (var definition in firmware.Where(x => x != null))
            {
                yield return definition.TitleKey;
                yield return definition.EffectKey;
                yield return definition.TradeoffKey;
            }
            foreach (var definition in modifiers.Where(x => x != null))
            {
                yield return definition.TitleKey;
                yield return definition.EffectKey;
                yield return definition.SingleClearCostKey;
            }
            foreach (var fixture in scriptedDayFixtures.Where(x => x != null))
            {
                var runtimeFixture = fixture.ToRuntimeFixture();
                yield return runtimeFixture.ExpectedFinalOutcomeKey;
                foreach (var step in runtimeFixture.Steps)
                {
                    yield return step.ExpectedArchiveKey;
                    yield return step.ExpectedOutcomeKey;
                }
            }
            foreach (var scenario in scenarios.Where(x => x != null))
            {
                yield return scenario.InfrastructureConditionKey;
                yield return scenario.BoundaryContextKey;
                yield return scenario.FailureBaselineKey;
                yield return scenario.ArchiveOutcomeKey;
                foreach (var foreshadow in scenario.Foreshadows)
                {
                    yield return foreshadow.captionKey;
                    yield return foreshadow.patternKey;
                    yield return foreshadow.conditionKey;
                }
                foreach (var route in scenario.Routes)
                {
                    yield return route.benefitKey;
                    yield return route.costKey;
                    yield return route.accessibleSummaryKey;
                }
            }
        }

        private static bool HaveUniqueIds(IEnumerable<string> ids, out string error)
        {
            error = string.Empty;
            var used = new HashSet<string>();
            foreach (var id in ids)
            {
                if (string.IsNullOrWhiteSpace(id) || !used.Add(id)) { error = "content.error.duplicate_or_empty_id:" + id; return false; }
            }
            return true;
        }

        private static bool IsSemanticKey(string key) => !string.IsNullOrWhiteSpace(key) && key.IndexOf(' ') < 0 && key.Contains(".");
    }
}
