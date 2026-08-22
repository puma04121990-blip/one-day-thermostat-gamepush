using System;
using System.Collections.Generic;

namespace OneDayThermostat.Core
{
    public enum SensorMode { Heat, Air, Vibration, Moisture, Network, Surface }
    public enum ComponentStage { Stable, Elevated, Strained, Warning, Protective }
    public enum StressSource { BaseRun, StartStop, TemperatureDelta, MoistureResidual, NetworkPeak, RouteConflict, SurfaceLag, RecoveryOffset }
    public enum EventPhase { Dormant, Foreshadow, Warning, Active, Aftermath, Cooldown }
    public enum PolicyDecisionStatus { Suggested, Valid, Blocked, Superseded }
    public enum CommandKind { SetRoute, Tune, Pulse, Isolate, Recover, CommitPolicy, CancelPolicy, SelectFirmware, SelectSensorModifier, SelectRouteModifier }

    [Serializable]
    public sealed class ZoneState
    {
        public string Id = string.Empty;
        public float AirTemperature;
        public float Moisture;
        public float Airflow;
        public float Exposure;
        public float SurfaceHeat;
        public float ActiveLoad;
        public float RhythmPressure;
        public bool IsExteriorBoundary;

        public ZoneState Clone()
        {
            return (ZoneState)MemberwiseClone();
        }
    }

    [Serializable]
    public sealed class RouteState
    {
        public string Id = string.Empty;
        public string FromZoneId = string.Empty;
        public string ToZoneId = string.Empty;
        public float Openness;
        public float Directness;
        public float NoiseWeight;
        public float LoadWeight;
        public float MoistureWeight;
        public bool IsAvailable = true;

        public RouteState Clone()
        {
            return (RouteState)MemberwiseClone();
        }
    }

    [Serializable]
    public sealed class ComponentState
    {
        public string Id = string.Empty;
        public ComponentStage Stage;
        public float Wear;
        public float RecentStress;
        public float RecoveryProgress;
        public string TopExplanationA = "reason.none";
        public string TopExplanationB = "reason.none";
        public long StageEnteredTick;
        public string ProtectiveReason = string.Empty;

        public ComponentState Clone()
        {
            return (ComponentState)MemberwiseClone();
        }
    }

    [Serializable]
    public sealed class ResidentRhythmState
    {
        public string Id = string.Empty;
        public string ZoneId = string.Empty;
        public bool IsActive;
        public bool AdaptationAvailable;
        public bool AdaptationSelected;
        public string ObservableMarkerKey = "rhythm.quiet_window";
        public bool PersonalNoteConsent;

        public ResidentRhythmState Clone()
        {
            return (ResidentRhythmState)MemberwiseClone();
        }
    }

    [Serializable]
    public sealed class EventState
    {
        public string ActiveChainId = "prologue.open_door";
        public EventPhase Phase = EventPhase.Dormant;
        public int ScenarioSeed = 20260822;
        public int CampaignIndex;
        public long PhaseEnteredTick;
        public string LastOutcomeKey = string.Empty;
        public bool FirstForeshadowObserved;
        public bool SecondForeshadowObserved;
        public readonly Dictionary<string, long> CooldownUntilTick = new Dictionary<string, long>();

        public EventState Clone()
        {
            var result = new EventState
            {
                ActiveChainId = ActiveChainId,
                Phase = Phase,
                ScenarioSeed = ScenarioSeed,
                CampaignIndex = CampaignIndex,
                PhaseEnteredTick = PhaseEnteredTick,
                LastOutcomeKey = LastOutcomeKey,
                FirstForeshadowObserved = FirstForeshadowObserved,
                SecondForeshadowObserved = SecondForeshadowObserved
            };
            foreach (var pair in CooldownUntilTick) result.CooldownUntilTick[pair.Key] = pair.Value;
            return result;
        }
    }

    [Serializable]
    public sealed class PolicyState
    {
        public string FirmwareId = "firmware.surface_memory";
        public string SensorModifierId = "modifier.early_contour";
        public string RouteModifierId = "modifier.soft_open";
        public string ActiveRuleId = string.Empty;
        public bool ActiveRuleEnabled;
        public readonly List<PolicyLogEntry> Log = new List<PolicyLogEntry>();

        public PolicyState Clone()
        {
            var result = new PolicyState
            {
                FirmwareId = FirmwareId,
                SensorModifierId = SensorModifierId,
                RouteModifierId = RouteModifierId,
                ActiveRuleId = ActiveRuleId,
                ActiveRuleEnabled = ActiveRuleEnabled
            };
            result.Log.AddRange(Log);
            return result;
        }
    }

    [Serializable]
    public struct PolicyLogEntry
    {
        public long Tick;
        public string RuleId;
        public PolicyDecisionStatus Status;
        public string ReasonKey;
        public string AlternativeKey;
    }

    [Serializable]
    public sealed class ArchiveState
    {
        public int StewardshipCredits;
        public readonly HashSet<string> UnlockedEntries = new HashSet<string>();
        public readonly List<string> UnresolvedCosts = new List<string>();

        public ArchiveState Clone()
        {
            var result = new ArchiveState { StewardshipCredits = StewardshipCredits };
            foreach (var entry in UnlockedEntries) result.UnlockedEntries.Add(entry);
            result.UnresolvedCosts.AddRange(UnresolvedCosts);
            return result;
        }
    }

    [Serializable]
    public struct SimulationCommand
    {
        public CommandKind Kind;
        public string TargetId;
        public float Value;
        public string Source;
        public long SubmittedAtTick;
    }

    [Serializable]
    public struct DiagnosticReason
    {
        public string Key;
        public string ZoneId;
        public float Weight;
    }

    [Serializable]
    public sealed class RoutePreview
    {
        public string RouteId = string.Empty;
        public string BenefitKey = string.Empty;
        public string CostKey = string.Empty;
        public float ExpectedLoadDelta;
        public float ExpectedWearDelta;
        public float ExpectedRhythmPressureDelta;
    }

    [Serializable]
    public sealed class SimulationSnapshot
    {
        public long Tick;
        public float DayProgress;
        public IReadOnlyList<ZoneState> Zones = Array.Empty<ZoneState>();
        public IReadOnlyList<RouteState> Routes = Array.Empty<RouteState>();
        public IReadOnlyList<ComponentState> Components = Array.Empty<ComponentState>();
        public IReadOnlyList<ResidentRhythmState> Residents = Array.Empty<ResidentRhythmState>();
        public EventState Event = new EventState();
        public PolicyState Policy = new PolicyState();
        public ArchiveState Archive = new ArchiveState();
        public IReadOnlyList<DiagnosticReason> Reasons = Array.Empty<DiagnosticReason>();
        public IReadOnlyList<RoutePreview> RoutesPreview = Array.Empty<RoutePreview>();
        public bool ReducedMotion;
        public bool LowSensory;
    }
}
