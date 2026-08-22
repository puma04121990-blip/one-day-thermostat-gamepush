using System;
using System.Collections.Generic;
using OneDayThermostat.Core;

namespace OneDayThermostat.Gameplay.Climate
{
    public interface IAuthoritativeSystem
    {
        void Step(SimulationWorld world, float deltaSeconds);
    }

    public sealed class ClimateSystem : IAuthoritativeSystem
    {
        public void Step(SimulationWorld world, float deltaSeconds)
        {
            var entrance = world.Zone("entrance");
            var exteriorCooling = .012f * (world.Event.Phase == EventPhase.Active ? 1.35f : 1f);
            entrance.AirTemperature = Clamp01(entrance.AirTemperature - exteriorCooling + .010f * RouteHeat(world, "route.direct_lower") + .006f * RouteHeat(world, "route.quiet_middle"));
            entrance.Airflow = Clamp01(.34f + (world.Event.Phase == EventPhase.Foreshadow ? .12f : .05f));

            foreach (var route in world.Routes.Values)
            {
                if (!route.IsAvailable || route.Openness <= 0f) continue;
                var from = world.Zone(route.FromZoneId);
                var to = world.Zone(route.ToZoneId);
                var transfer = (from.AirTemperature - to.AirTemperature) * route.Openness * (.18f + route.Directness * .12f);
                to.AirTemperature = Clamp01(to.AirTemperature + transfer);
                from.AirTemperature = Clamp01(from.AirTemperature - transfer * .35f);
                to.ActiveLoad = Clamp01(to.ActiveLoad + route.Openness * route.LoadWeight * .035f);
                to.Moisture = Clamp01(to.Moisture + from.Moisture * route.MoistureWeight * .009f);
            }

            var kitchen = world.Zone("lera_kitchen");
            kitchen.ActiveLoad = Clamp01(kitchen.ActiveLoad + .014f - .007f * world.Route("route.drain_quiet").Openness);
            kitchen.Moisture = Clamp01(kitchen.Moisture + .012f - .016f * world.Route("route.drain_quiet").Openness);
            kitchen.SurfaceHeat = Clamp01(kitchen.SurfaceHeat + .006f - .002f * deltaSeconds);

            var westWall = world.Zone("west_wall");
            westWall.SurfaceHeat = Clamp01(westWall.SurfaceHeat + (westWall.Exposure > .45f ? .004f : -.008f));
            westWall.AirTemperature = Clamp01(westWall.AirTemperature + (westWall.SurfaceHeat - westWall.AirTemperature) * .035f);

            var sasha = world.Zone("sasha_room");
            var direct = world.Route("route.direct_lower");
            sasha.RhythmPressure = Clamp01(.07f + direct.Openness * direct.NoiseWeight * .58f + world.Zone("entrance").Airflow * .08f - world.Route("route.quiet_middle").Openness * .18f);
            sasha.AirTemperature = Clamp01(sasha.AirTemperature + world.Route("route.soft_open").Openness * .012f);

            foreach (var zone in world.Zones.Values)
            {
                zone.ActiveLoad = Clamp01(zone.ActiveLoad - .006f);
                zone.Moisture = Clamp01(zone.Moisture - .0025f);
                zone.SurfaceHeat = Clamp01(zone.SurfaceHeat + (zone.AirTemperature - zone.SurfaceHeat) * .015f);
            }
        }

        private static float RouteHeat(SimulationWorld world, string routeId)
        {
            var route = world.Route(routeId);
            return route.Openness * (world.Zone(route.FromZoneId).AirTemperature + .25f);
        }

        private static float Clamp01(float value) => Math.Max(0f, Math.Min(1f, value));
    }

    public sealed class ComponentStressSystem : IAuthoritativeSystem
    {
        public void Step(SimulationWorld world, float deltaSeconds)
        {
            UpdateBranch26(world, deltaSeconds);
            UpdateDrain(world, deltaSeconds);
            UpdateNetwork(world, deltaSeconds);
        }

        private static void UpdateBranch26(SimulationWorld world, float deltaSeconds)
        {
            var direct = world.Route("route.direct_lower");
            var sasha = world.Zone("sasha_room");
            var component = world.Component("component.branch_26");
            var contributions = new List<(StressSource source, float value, string key)>
            {
                (StressSource.StartStop, direct.Openness * .38f, "reason.start_stop"),
                (StressSource.RouteConflict, sasha.RhythmPressure * .46f, "reason.quiet_window"),
                (StressSource.TemperatureDelta, Math.Abs(world.Zone("lower_riser").AirTemperature - world.Zone("entrance").AirTemperature) * .18f, "reason.temperature_delta")
            };
            Apply(component, contributions, deltaSeconds, world.Tick);
        }

        private static void UpdateDrain(SimulationWorld world, float deltaSeconds)
        {
            var kitchen = world.Zone("lera_kitchen");
            var component = world.Component("component.kitchen_drain");
            var contributions = new List<(StressSource source, float value, string key)>
            {
                (StressSource.MoistureResidual, kitchen.Moisture * .40f, "reason.moisture_residual"),
                (StressSource.NetworkPeak, kitchen.ActiveLoad * .25f, "reason.kitchen_queue")
            };
            Apply(component, contributions, deltaSeconds, world.Tick);
        }

        private static void UpdateNetwork(SimulationWorld world, float deltaSeconds)
        {
            var component = world.Component("component.network_main");
            var kitchen = world.Zone("lera_kitchen");
            var entrance = world.Zone("entrance");
            var contributions = new List<(StressSource source, float value, string key)>
            {
                (StressSource.NetworkPeak, (kitchen.ActiveLoad + entrance.ActiveLoad) * .36f, "reason.network_queue"),
                (StressSource.SurfaceLag, world.Zone("west_wall").SurfaceHeat * .18f, "reason.surface_memory")
            };
            Apply(component, contributions, deltaSeconds, world.Tick);
        }

        private static void Apply(ComponentState state, List<(StressSource source, float value, string key)> contributions, float dt, long tick)
        {
            contributions.Sort((a, b) => b.value.CompareTo(a.value));
            var load = 0f;
            foreach (var contribution in contributions) load += contribution.value;
            var recovery = load < .16f ? .035f : .006f;
            state.RecentStress = Lerp(state.RecentStress, load, .30f);
            state.Wear = Clamp01(state.Wear + (load - recovery) * dt * .15f);
            state.RecoveryProgress = Clamp01(state.RecoveryProgress + (recovery - load * .25f) * dt);
            state.TopExplanationA = contributions.Count > 0 ? contributions[0].key : "reason.none";
            state.TopExplanationB = contributions.Count > 1 ? contributions[1].key : "reason.none";

            var desired = state.Wear >= .76f ? ComponentStage.Protective : state.Wear >= .58f ? ComponentStage.Warning : state.Wear >= .39f ? ComponentStage.Strained : state.Wear >= .22f ? ComponentStage.Elevated : ComponentStage.Stable;
            if (desired != state.Stage)
            {
                state.Stage = desired;
                state.StageEnteredTick = tick;
                state.ProtectiveReason = desired == ComponentStage.Protective ? state.TopExplanationA : string.Empty;
            }
        }

        private static float Clamp01(float value) => Math.Max(0f, Math.Min(1f, value));
        private static float Lerp(float from, float to, float t) => from + (to - from) * t;
    }

    public sealed class ResidentRhythmSystem : IAuthoritativeSystem
    {
        public void Step(SimulationWorld world, float deltaSeconds)
        {
            var sasha = world.Residents["resident.sasha"];
            sasha.AdaptationAvailable = world.Zone("sasha_room").RhythmPressure < .24f && world.Event.Phase >= EventPhase.Warning;
            if (sasha.AdaptationAvailable && !sasha.AdaptationSelected && world.Tick % 10 == 0)
            {
                sasha.AdaptationSelected = true;
                world.Archive.UnlockedEntries.Add("archive.quiet_route");
            }

            var lera = world.Residents["resident.lera"];
            lera.AdaptationAvailable = world.Zone("lera_kitchen").Moisture < .48f && world.Event.Phase == EventPhase.Aftermath;
        }
    }

    public sealed class EventDirector : IAuthoritativeSystem
    {
        public void Step(SimulationWorld world, float deltaSeconds)
        {
            var entrance = world.Zone("entrance");
            var direct = world.Route("route.direct_lower");
            var quiet = world.Route("route.quiet_middle");

            if (world.Event.Phase == EventPhase.Foreshadow)
            {
                world.Event.FirstForeshadowObserved = entrance.AirTemperature < .30f;
                world.Event.SecondForeshadowObserved = entrance.Airflow > .38f;
                if (world.Event.FirstForeshadowObserved && world.Event.SecondForeshadowObserved && world.Tick >= 4)
                {
                    Transition(world, EventPhase.Warning);
                }
            }
            else if (world.Event.Phase == EventPhase.Warning && (direct.Openness > .55f || quiet.Openness > .45f))
            {
                Transition(world, EventPhase.Active);
            }
            else if (world.Event.Phase == EventPhase.Active && entrance.AirTemperature > .33f)
            {
                Transition(world, EventPhase.Aftermath);
                world.Archive.UnlockedEntries.Add("archive.threshold_route");
                if (quiet.Openness > .28f && direct.Openness < .64f)
                {
                    world.Archive.StewardshipCredits += 2;
                }
                else
                {
                    world.Archive.UnresolvedCosts.Add("cost.branch_26_resonance");
                }
            }
        }

        private static void Transition(SimulationWorld world, EventPhase next)
        {
            world.Event.Phase = next;
            world.Event.PhaseEnteredTick = world.Tick;
        }
    }
}
