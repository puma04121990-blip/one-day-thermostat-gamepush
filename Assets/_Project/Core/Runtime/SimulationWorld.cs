using System;
using System.Collections.Generic;
using System.Linq;

namespace OneDayThermostat.Core
{
    public sealed class SimulationWorld
    {
        public long Tick;
        public float DayProgress;
        public readonly Dictionary<string, ZoneState> Zones = new Dictionary<string, ZoneState>();
        public readonly Dictionary<string, RouteState> Routes = new Dictionary<string, RouteState>();
        public readonly Dictionary<string, ComponentState> Components = new Dictionary<string, ComponentState>();
        public readonly Dictionary<string, ResidentRhythmState> Residents = new Dictionary<string, ResidentRhythmState>();
        public EventState Event = new EventState();
        public PolicyState Policy = new PolicyState();
        public ArchiveState Archive = new ArchiveState();
        public bool ReducedMotion;
        public bool LowSensory;
        public readonly List<SimulationCommand> PendingCommands = new List<SimulationCommand>();
        public readonly List<DiagnosticReason> LatestReasons = new List<DiagnosticReason>();
        public readonly List<RoutePreview> LatestPreviews = new List<RoutePreview>();

        public ZoneState Zone(string id) => Zones[id];
        public RouteState Route(string id) => Routes[id];
        public ComponentState Component(string id) => Components[id];

        public SimulationSnapshot CreateSnapshot()
        {
            return new SimulationSnapshot
            {
                Tick = Tick,
                DayProgress = DayProgress,
                Zones = Zones.Values.Select(x => x.Clone()).OrderBy(x => x.Id).ToArray(),
                Routes = Routes.Values.Select(x => x.Clone()).OrderBy(x => x.Id).ToArray(),
                Components = Components.Values.Select(x => x.Clone()).OrderBy(x => x.Id).ToArray(),
                Residents = Residents.Values.Select(x => x.Clone()).OrderBy(x => x.Id).ToArray(),
                Event = Event.Clone(),
                Policy = Policy.Clone(),
                Archive = Archive.Clone(),
                Reasons = LatestReasons.ToArray(),
                RoutesPreview = LatestPreviews.ToArray(),
                ReducedMotion = ReducedMotion,
                LowSensory = LowSensory
            };
        }

        public static SimulationWorld CreatePrologue(int scenarioSeed = 20260822)
        {
            var world = new SimulationWorld();
            world.Event.ScenarioSeed = scenarioSeed;
            world.Event.ActiveChainId = "prologue.open_door";
            world.Event.Phase = EventPhase.Foreshadow;
            world.Event.PhaseEnteredTick = 0;

            world.Zones["entrance"] = new ZoneState { Id = "entrance", AirTemperature = .24f, Moisture = .26f, Airflow = .42f, Exposure = .08f, SurfaceHeat = .22f, ActiveLoad = .10f, RhythmPressure = .05f, IsExteriorBoundary = true };
            world.Zones["lower_riser"] = new ZoneState { Id = "lower_riser", AirTemperature = .52f, Moisture = .16f, Airflow = .12f, Exposure = .05f, SurfaceHeat = .48f, ActiveLoad = .22f, RhythmPressure = .08f };
            world.Zones["middle_loop"] = new ZoneState { Id = "middle_loop", AirTemperature = .46f, Moisture = .14f, Airflow = .09f, Exposure = .06f, SurfaceHeat = .45f, ActiveLoad = .14f, RhythmPressure = .04f };
            world.Zones["lera_kitchen"] = new ZoneState { Id = "lera_kitchen", AirTemperature = .56f, Moisture = .20f, Airflow = .08f, Exposure = .16f, SurfaceHeat = .49f, ActiveLoad = .30f, RhythmPressure = .10f };
            world.Zones["sasha_room"] = new ZoneState { Id = "sasha_room", AirTemperature = .39f, Moisture = .14f, Airflow = .10f, Exposure = .10f, SurfaceHeat = .42f, ActiveLoad = .12f, RhythmPressure = .10f };
            world.Zones["west_wall"] = new ZoneState { Id = "west_wall", AirTemperature = .50f, Moisture = .12f, Airflow = .05f, Exposure = .78f, SurfaceHeat = .72f, ActiveLoad = .11f, RhythmPressure = .06f, IsExteriorBoundary = true };

            world.Routes["route.direct_lower"] = new RouteState { Id = "route.direct_lower", FromZoneId = "lower_riser", ToZoneId = "entrance", Openness = .25f, Directness = 1f, NoiseWeight = .90f, LoadWeight = .72f, MoistureWeight = .18f };
            world.Routes["route.quiet_middle"] = new RouteState { Id = "route.quiet_middle", FromZoneId = "middle_loop", ToZoneId = "entrance", Openness = .10f, Directness = .55f, NoiseWeight = .18f, LoadWeight = .35f, MoistureWeight = .12f };
            world.Routes["route.soft_open"] = new RouteState { Id = "route.soft_open", FromZoneId = "middle_loop", ToZoneId = "sasha_room", Openness = .20f, Directness = .42f, NoiseWeight = .12f, LoadWeight = .20f, MoistureWeight = .05f };
            world.Routes["route.drain_quiet"] = new RouteState { Id = "route.drain_quiet", FromZoneId = "lera_kitchen", ToZoneId = "entrance", Openness = .05f, Directness = .45f, NoiseWeight = .16f, LoadWeight = .25f, MoistureWeight = .75f };

            world.Components["component.branch_26"] = new ComponentState { Id = "component.branch_26", Stage = ComponentStage.Stable, Wear = .16f, RecentStress = .10f, RecoveryProgress = .12f };
            world.Components["component.kitchen_drain"] = new ComponentState { Id = "component.kitchen_drain", Stage = ComponentStage.Stable, Wear = .09f, RecentStress = .05f, RecoveryProgress = .18f };
            world.Components["component.network_main"] = new ComponentState { Id = "component.network_main", Stage = ComponentStage.Stable, Wear = .12f, RecentStress = .08f, RecoveryProgress = .14f };

            world.Residents["resident.arkady"] = new ResidentRhythmState { Id = "resident.arkady", ZoneId = "entrance", IsActive = true, ObservableMarkerKey = "rhythm.threshold_transition" };
            world.Residents["resident.lera"] = new ResidentRhythmState { Id = "resident.lera", ZoneId = "lera_kitchen", IsActive = true, ObservableMarkerKey = "rhythm.kitchen_sequence" };
            world.Residents["resident.sasha"] = new ResidentRhythmState { Id = "resident.sasha", ZoneId = "sasha_room", IsActive = true, ObservableMarkerKey = "rhythm.quiet_window" };
            world.Residents["resident.vera"] = new ResidentRhythmState { Id = "resident.vera", ZoneId = "sasha_room", IsActive = true, ObservableMarkerKey = "rhythm.window_airing" };

            world.Archive.UnlockedEntries.Add("archive.first_flow");
            return world;
        }
    }
}
