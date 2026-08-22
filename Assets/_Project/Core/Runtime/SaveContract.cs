using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace OneDayThermostat.Core
{
    [Serializable]
    public sealed class ThermostatSaveRootDTO
    {
        public int schemaVersion = 1;
        public string buildContentVersion = "0.1.0";
        public string slotId = "slot_00";
        public long savedAtUtcTicks;
        public long simulationTick;
        public int scenarioSeed;
        public string integrity = string.Empty;
        public ZoneState[] zones = Array.Empty<ZoneState>();
        public RouteState[] routes = Array.Empty<RouteState>();
        public ComponentState[] components = Array.Empty<ComponentState>();
        public ResidentRhythmState[] residents = Array.Empty<ResidentRhythmState>();
        public EventSaveDTO events = new EventSaveDTO();
        public PolicySaveDTO policies = new PolicySaveDTO();
        public ArchiveSaveDTO archive = new ArchiveSaveDTO();
        public CommandLogCursorDTO logCursor = new CommandLogCursorDTO();
    }

    [Serializable]
    public sealed class EventSaveDTO
    {
        public string activeChainId = string.Empty;
        public EventPhase phase;
        public int scenarioSeed;
        public int campaignIndex;
        public long phaseEnteredTick;
        public string lastOutcomeKey = string.Empty;
        public bool firstForeshadowObserved;
        public bool secondForeshadowObserved;
        public CooldownSaveDTO[] cooldowns = Array.Empty<CooldownSaveDTO>();
    }

    [Serializable]
    public struct CooldownSaveDTO { public string family; public long untilTick; }

    [Serializable]
    public sealed class PolicySaveDTO
    {
        public string firmwareId = string.Empty;
        public string sensorModifierId = string.Empty;
        public string routeModifierId = string.Empty;
        public string activeRuleId = string.Empty;
        public bool activeRuleEnabled;
        public PolicyLogEntry[] entries = Array.Empty<PolicyLogEntry>();
    }

    [Serializable]
    public sealed class ArchiveSaveDTO
    {
        public int stewardshipCredits;
        public string[] unlockedEntries = Array.Empty<string>();
        public string[] unresolvedCosts = Array.Empty<string>();
        public ServiceFollowUp[] serviceFollowUps = Array.Empty<ServiceFollowUp>();
        public bool endOfDayReviewAvailable;
        public string endOfDayReviewKey = string.Empty;
        public string[] unlockedAchievements = Array.Empty<string>();
        public string[] pendingPlatformAchievements = Array.Empty<string>();
    }

    [Serializable]
    public sealed class CommandLogCursorDTO { public long lastCommittedTick; public int committedCount; }

    public interface ISaveSerializer
    {
        string Serialize(ThermostatSaveRootDTO root);
        ThermostatSaveRootDTO Deserialize(string raw);
    }

    public interface ISaveStorage
    {
        void WriteAllText(string path, string content);
        string ReadAllText(string path);
        bool Exists(string path);
        void Move(string source, string destination, bool overwrite);
        void Delete(string path);
        void EnsureDirectory(string path);
    }

    public sealed class FileSaveStorage : ISaveStorage
    {
        public void WriteAllText(string path, string content) => File.WriteAllText(path, content);
        public string ReadAllText(string path) => File.ReadAllText(path);
        public bool Exists(string path) => File.Exists(path);
        public void Move(string source, string destination, bool overwrite)
        {
            if (overwrite && File.Exists(destination)) File.Delete(destination);
            File.Move(source, destination);
        }
        public void Delete(string path) { if (File.Exists(path)) File.Delete(path); }
        public void EnsureDirectory(string path) => Directory.CreateDirectory(path);
    }

    public static class SaveMapper
    {
        public static ThermostatSaveRootDTO ToDto(SimulationWorld world, string slotId, string contentVersion)
        {
            var root = new ThermostatSaveRootDTO
            {
                buildContentVersion = contentVersion,
                slotId = slotId,
                savedAtUtcTicks = DateTime.UtcNow.Ticks,
                simulationTick = world.Tick,
                scenarioSeed = world.Event.ScenarioSeed,
                zones = world.Zones.Values.Select(x => x.Clone()).ToArray(),
                routes = world.Routes.Values.Select(x => x.Clone()).ToArray(),
                components = world.Components.Values.Select(x => x.Clone()).ToArray(),
                residents = world.Residents.Values.Select(x => x.Clone()).ToArray(),
                events = new EventSaveDTO
                {
                    activeChainId = world.Event.ActiveChainId,
                    phase = world.Event.Phase,
                    scenarioSeed = world.Event.ScenarioSeed,
                    campaignIndex = world.Event.CampaignIndex,
                    phaseEnteredTick = world.Event.PhaseEnteredTick,
                    lastOutcomeKey = world.Event.LastOutcomeKey,
                    firstForeshadowObserved = world.Event.FirstForeshadowObserved,
                    secondForeshadowObserved = world.Event.SecondForeshadowObserved,
                    cooldowns = world.Event.CooldownUntilTick.Select(x => new CooldownSaveDTO { family = x.Key, untilTick = x.Value }).ToArray()
                },
                policies = new PolicySaveDTO
                {
                    firmwareId = world.Policy.FirmwareId,
                    sensorModifierId = world.Policy.SensorModifierId,
                    routeModifierId = world.Policy.RouteModifierId,
                    activeRuleId = world.Policy.ActiveRuleId,
                    activeRuleEnabled = world.Policy.ActiveRuleEnabled,
                    entries = world.Policy.Log.ToArray()
                },
                archive = new ArchiveSaveDTO
                {
                    stewardshipCredits = world.Archive.StewardshipCredits,
                    unlockedEntries = world.Archive.UnlockedEntries.ToArray(),
                    unresolvedCosts = world.Archive.UnresolvedCosts.ToArray(),
                    serviceFollowUps = world.Archive.ServiceFollowUps.Select(x => x.Clone()).ToArray(),
                    endOfDayReviewAvailable = world.Archive.EndOfDayReviewAvailable,
                    endOfDayReviewKey = world.Archive.EndOfDayReviewKey,
                    unlockedAchievements = world.Archive.UnlockedAchievements.ToArray(),
                    pendingPlatformAchievements = world.Archive.PendingPlatformAchievements.ToArray()
                },
                logCursor = new CommandLogCursorDTO { lastCommittedTick = world.Tick, committedCount = 0 }
            };
            root.integrity = BuildIntegrity(root);
            return root;
        }

        public static SimulationWorld ToWorld(ThermostatSaveRootDTO root)
        {
            if (root == null) throw new InvalidDataException("save.error.null_root");
            if (root.schemaVersion != 1) throw new InvalidDataException("save.error.unsupported_schema");
            if (root.integrity != BuildIntegrity(root)) throw new InvalidDataException("save.error.integrity_mismatch");

            var world = new SimulationWorld { Tick = root.simulationTick, Event = new EventState(), Policy = new PolicyState(), Archive = new ArchiveState() };
            foreach (var zone in root.zones ?? Array.Empty<ZoneState>()) world.Zones[zone.Id] = zone.Clone();
            foreach (var route in root.routes ?? Array.Empty<RouteState>()) world.Routes[route.Id] = route.Clone();
            foreach (var component in root.components ?? Array.Empty<ComponentState>()) world.Components[component.Id] = component.Clone();
            foreach (var resident in root.residents ?? Array.Empty<ResidentRhythmState>()) world.Residents[resident.Id] = resident.Clone();
            world.Event.ActiveChainId = root.events.activeChainId;
            world.Event.Phase = root.events.phase;
            world.Event.ScenarioSeed = root.events.scenarioSeed;
            world.Event.CampaignIndex = root.events.campaignIndex;
            world.Event.PhaseEnteredTick = root.events.phaseEnteredTick;
            world.Event.LastOutcomeKey = root.events.lastOutcomeKey;
            world.Event.FirstForeshadowObserved = root.events.firstForeshadowObserved;
            world.Event.SecondForeshadowObserved = root.events.secondForeshadowObserved;
            foreach (var cooldown in root.events.cooldowns ?? Array.Empty<CooldownSaveDTO>()) world.Event.CooldownUntilTick[cooldown.family] = cooldown.untilTick;
            world.Policy.FirmwareId = root.policies.firmwareId;
            world.Policy.SensorModifierId = root.policies.sensorModifierId;
            world.Policy.RouteModifierId = root.policies.routeModifierId;
            world.Policy.ActiveRuleId = root.policies.activeRuleId;
            world.Policy.ActiveRuleEnabled = root.policies.activeRuleEnabled;
            world.Policy.Log.AddRange(root.policies.entries ?? Array.Empty<PolicyLogEntry>());
            world.Archive.StewardshipCredits = root.archive.stewardshipCredits;
            foreach (var entry in root.archive.unlockedEntries ?? Array.Empty<string>()) world.Archive.UnlockedEntries.Add(entry);
            world.Archive.UnresolvedCosts.AddRange(root.archive.unresolvedCosts ?? Array.Empty<string>());
            world.Archive.ServiceFollowUps.AddRange((root.archive.serviceFollowUps ?? Array.Empty<ServiceFollowUp>()).Select(x => x.Clone()));
            world.Archive.EndOfDayReviewAvailable = root.archive.endOfDayReviewAvailable;
            world.Archive.EndOfDayReviewKey = root.archive.endOfDayReviewKey;
            foreach (var achievement in root.archive.unlockedAchievements ?? Array.Empty<string>()) world.Archive.UnlockedAchievements.Add(achievement);
            world.Archive.PendingPlatformAchievements.AddRange(root.archive.pendingPlatformAchievements ?? Array.Empty<string>());
            return world;
        }

        private static string BuildIntegrity(ThermostatSaveRootDTO root)
        {
            var value = $"{root.schemaVersion}|{root.slotId}|{root.simulationTick}|{root.scenarioSeed}|{root.zones?.Length ?? 0}|{root.components?.Length ?? 0}|{root.events?.activeChainId}";
            unchecked
            {
                var hash = 17;
                foreach (var character in value) hash = hash * 31 + character;
                return hash.ToString("X8");
            }
        }
    }

    public sealed class SaveCoordinator
    {
        private readonly ISaveStorage _storage;
        private readonly ISaveSerializer _serializer;
        private readonly string _rootDirectory;

        public SaveCoordinator(ISaveStorage storage, ISaveSerializer serializer, string rootDirectory)
        {
            _storage = storage;
            _serializer = serializer;
            _rootDirectory = rootDirectory;
        }

        public void Save(SimulationWorld world, string slotId, string contentVersion)
        {
            var slotDirectory = Path.Combine(_rootDirectory, "saves", slotId);
            var current = Path.Combine(slotDirectory, "state_current.json");
            var backup = Path.Combine(slotDirectory, "state_backup.json");
            var temporary = Path.Combine(slotDirectory, "state_tmp.json");
            _storage.EnsureDirectory(slotDirectory);

            var dto = SaveMapper.ToDto(world, slotId, contentVersion);
            _storage.WriteAllText(temporary, _serializer.Serialize(dto));
            var verified = _serializer.Deserialize(_storage.ReadAllText(temporary));
            SaveMapper.ToWorld(verified); // validates DTO before promotion
            if (_storage.Exists(current)) _storage.Move(current, backup, true);
            _storage.Move(temporary, current, true);
        }

        public SimulationWorld LoadNewestValid(string slotId)
        {
            var slotDirectory = Path.Combine(_rootDirectory, "saves", slotId);
            var candidates = new[] { Path.Combine(slotDirectory, "state_current.json"), Path.Combine(slotDirectory, "state_backup.json") };
            foreach (var path in candidates)
            {
                if (!_storage.Exists(path)) continue;
                try { return SaveMapper.ToWorld(_serializer.Deserialize(_storage.ReadAllText(path))); }
                catch (Exception) { /* Try the backup without overwriting evidence. */ }
            }
            throw new FileNotFoundException("save.error.no_valid_slot", slotId);
        }
    }
}
