using System;
using System.Collections.Generic;
using OneDayThermostat.Content;
using OneDayThermostat.Core;
using OneDayThermostat.Gameplay.Automation;
using UnityEngine;

namespace OneDayThermostat.Content.Definitions
{
    [CreateAssetMenu(menuName = "One Day Thermostat/Scenario Definition", fileName = "Scenario_")]
    public sealed class ScenarioDefinitionAsset : ScriptableObject
    {
        [SerializeField] private string stableId;
        [SerializeField] private string climateProfileId;
        [SerializeField] private string infrastructureConditionKey;
        [SerializeField] private string boundaryContextKey;
        [SerializeField] private string failureBaselineKey;
        [SerializeField] private string archiveOutcomeKey;
        [SerializeField] private string cooldownFamily;
        [SerializeField] private bool supportsLowSensory = true;
        [SerializeField] private List<ForeshadowAsset> foreshadows = new List<ForeshadowAsset>();
        [SerializeField] private List<RouteAsset> routes = new List<RouteAsset>();

        public string StableId => stableId;
        public string ClimateProfileId => climateProfileId;
        public string InfrastructureConditionKey => infrastructureConditionKey;
        public string BoundaryContextKey => boundaryContextKey;
        public string FailureBaselineKey => failureBaselineKey;
        public string ArchiveOutcomeKey => archiveOutcomeKey;
        public string CooldownFamily => cooldownFamily;
        public bool SupportsLowSensory => supportsLowSensory;
        public IReadOnlyList<ForeshadowAsset> Foreshadows => foreshadows;
        public IReadOnlyList<RouteAsset> Routes => routes;

        public bool IsSafe(out string reason) => ToRuntimeDefinition().IsAuthorable(out reason);

        public ScenarioDefinition ToRuntimeDefinition()
        {
            var runtime = new ScenarioDefinition
            {
                Id = stableId,
                ClimateProfileId = climateProfileId,
                InfrastructureConditionKey = infrastructureConditionKey,
                BoundaryContextKey = boundaryContextKey,
                FailureBaselineKey = failureBaselineKey,
                ArchiveOutcomeKey = archiveOutcomeKey,
                CooldownFamily = cooldownFamily,
                SupportsLowSensory = supportsLowSensory
            };
            foreach (var item in foreshadows)
            {
                if (item == null) continue;
                runtime.Foreshadows.Add(new ForeshadowDefinition
                {
                    Id = item.stableId,
                    SensorModeKey = "sensor." + item.sensorMode.ToString().ToLowerInvariant(),
                    SensoryFamily = item.sensoryFamily,
                    CaptionKey = item.captionKey,
                    PatternKey = item.patternKey,
                    ConditionKey = item.conditionKey
                });
            }
            foreach (var item in routes)
            {
                if (item == null) continue;
                runtime.Routes.Add(new ScenarioRouteDefinition
                {
                    RouteId = item.routeId,
                    BenefitKey = item.benefitKey,
                    CostKey = item.costKey,
                    AccessibleSummaryKey = item.accessibleSummaryKey,
                    PreservesResidentAgency = true
                });
            }
            return runtime;
        }
    }

    [Serializable]
    public sealed class ForeshadowAsset
    {
        public string stableId;
        public SensorMode sensorMode;
        public string sensoryFamily;
        public string captionKey;
        public string patternKey;
        public string conditionKey;
    }

    [Serializable]
    public sealed class RouteAsset
    {
        public string routeId;
        public string benefitKey;
        public string costKey;
        public string accessibleSummaryKey;
    }

    [CreateAssetMenu(menuName = "One Day Thermostat/Scripted Day Fixture", fileName = "Fixture_")]
    public sealed class ScriptedDayFixtureAsset : ScriptableObject
    {
        [SerializeField] private string stableId;
        [SerializeField] private string expectedFinalOutcomeKey;
        [SerializeField] private List<ScriptedScenarioStepAsset> steps = new List<ScriptedScenarioStepAsset>();

        public string StableId => stableId;
        public IReadOnlyList<ScriptedScenarioStepAsset> Steps => steps;

        public bool IsSafe(IReadOnlyList<ScenarioDefinition> scenarios, out string reason) => ToRuntimeFixture().IsSafe(scenarios, out reason);

        public ScriptedDayFixture ToRuntimeFixture()
        {
            var fixture = new ScriptedDayFixture { Id = stableId, ExpectedFinalOutcomeKey = expectedFinalOutcomeKey };
            foreach (var item in steps)
            {
                if (item == null) continue;
                fixture.Steps.Add(new ScriptedScenarioStep
                {
                    ScenarioId = item.scenarioId,
                    RouteId = item.routeId,
                    Openness = item.openness,
                    ExpectedArchiveKey = item.expectedArchiveKey,
                    ExpectedOutcomeKey = item.expectedOutcomeKey,
                    MaxTicksToWarning = item.maxTicksToWarning,
                    MaxTicksToResolution = item.maxTicksToResolution
                });
            }
            return fixture;
        }
    }

    [Serializable]
    public sealed class ScriptedScenarioStepAsset
    {
        public string scenarioId;
        public string routeId;
        [Range(0f, 1f)] public float openness;
        public string expectedArchiveKey;
        public string expectedOutcomeKey;
        [Min(1)] public int maxTicksToWarning = 24;
        [Min(1)] public int maxTicksToResolution = 18;
    }

    public enum ModifierKind { Sensor, Route }

    [CreateAssetMenu(menuName = "One Day Thermostat/Firmware", fileName = "Firmware_")]
    public sealed class FirmwareDefinitionAsset : ScriptableObject
    {
        [SerializeField] private string stableId;
        [SerializeField] private string titleKey;
        [SerializeField] private string effectKey;
        [SerializeField] private string tradeoffKey;
        [SerializeField] private FirmwareTuning tuning;
        [SerializeField] private bool onlyChangesRankingVisibilityOrTiming = true;

        public string StableId => stableId;
        public string TitleKey => titleKey;
        public string EffectKey => effectKey;
        public string TradeoffKey => tradeoffKey;
        public bool IsSafe => onlyChangesRankingVisibilityOrTiming && !string.IsNullOrWhiteSpace(stableId) && !string.IsNullOrWhiteSpace(titleKey) && !string.IsNullOrWhiteSpace(effectKey) && !string.IsNullOrWhiteSpace(tradeoffKey);

        public FirmwareDefinition ToRuntimeDefinition()
        {
            return new FirmwareDefinition { Id = stableId, TitleKey = titleKey, EffectKey = effectKey, TradeoffKey = tradeoffKey, Tuning = tuning };
        }
    }

    [CreateAssetMenu(menuName = "One Day Thermostat/Modifier", fileName = "Modifier_")]
    public sealed class ModifierDefinitionAsset : ScriptableObject
    {
        [SerializeField] private string stableId;
        [SerializeField] private ModifierKind kind;
        [SerializeField] private string titleKey;
        [SerializeField] private string effectKey;
        [SerializeField] private string singleClearCostKey;
        [SerializeField] private ModifierTuning tuning;

        public string StableId => stableId;
        public ModifierKind Kind => kind;
        public string TitleKey => titleKey;
        public string EffectKey => effectKey;
        public string SingleClearCostKey => singleClearCostKey;
        public bool IsSafe => !string.IsNullOrWhiteSpace(stableId) && !string.IsNullOrWhiteSpace(titleKey) && !string.IsNullOrWhiteSpace(effectKey) && !string.IsNullOrWhiteSpace(singleClearCostKey);

        public ModifierDefinition ToRuntimeDefinition()
        {
            return new ModifierDefinition
            {
                Id = stableId,
                Channel = kind == ModifierKind.Sensor ? ModifierChannel.Sensor : ModifierChannel.Route,
                TitleKey = titleKey,
                EffectKey = effectKey,
                TradeoffKey = singleClearCostKey,
                Tuning = tuning
            };
        }
    }
}
