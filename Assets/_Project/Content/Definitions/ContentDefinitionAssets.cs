using System;
using System.Collections.Generic;
using OneDayThermostat.Core;
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

    public enum ModifierKind { Sensor, Route }

    [CreateAssetMenu(menuName = "One Day Thermostat/Firmware", fileName = "Firmware_")]
    public sealed class FirmwareDefinitionAsset : ScriptableObject
    {
        [SerializeField] private string stableId;
        [SerializeField] private string titleKey;
        [SerializeField] private string effectKey;
        [SerializeField] private string tradeoffKey;
        [SerializeField] private bool onlyChangesRankingVisibilityOrTiming = true;

        public string StableId => stableId;
        public string TitleKey => titleKey;
        public string EffectKey => effectKey;
        public string TradeoffKey => tradeoffKey;
        public bool IsSafe => onlyChangesRankingVisibilityOrTiming && !string.IsNullOrWhiteSpace(stableId) && !string.IsNullOrWhiteSpace(effectKey) && !string.IsNullOrWhiteSpace(tradeoffKey);
    }

    [CreateAssetMenu(menuName = "One Day Thermostat/Modifier", fileName = "Modifier_")]
    public sealed class ModifierDefinitionAsset : ScriptableObject
    {
        [SerializeField] private string stableId;
        [SerializeField] private ModifierKind kind;
        [SerializeField] private string effectKey;
        [SerializeField] private string singleClearCostKey;

        public string StableId => stableId;
        public ModifierKind Kind => kind;
        public string EffectKey => effectKey;
        public string SingleClearCostKey => singleClearCostKey;
        public bool IsSafe => !string.IsNullOrWhiteSpace(stableId) && !string.IsNullOrWhiteSpace(effectKey) && !string.IsNullOrWhiteSpace(singleClearCostKey);
    }
}
