using System;
using System.Collections.Generic;
using System.Linq;
using OneDayThermostat.Core;

namespace OneDayThermostat.Content
{
    [Serializable]
    public sealed class ScenarioDefinition
    {
        public string Id = string.Empty;
        public string ClimateProfileId = string.Empty;
        public string InfrastructureConditionKey = string.Empty;
        public string BoundaryContextKey = string.Empty;
        public string FailureBaselineKey = string.Empty;
        public string ArchiveOutcomeKey = string.Empty;
        public string CooldownFamily = string.Empty;
        public bool SupportsLowSensory = true;
        public readonly List<ForeshadowDefinition> Foreshadows = new List<ForeshadowDefinition>();
        public readonly List<ScenarioRouteDefinition> Routes = new List<ScenarioRouteDefinition>();

        public bool IsFair(out string reason)
        {
            if (string.IsNullOrWhiteSpace(Id) || string.IsNullOrWhiteSpace(ClimateProfileId) || string.IsNullOrWhiteSpace(InfrastructureConditionKey))
            {
                reason = "scenario.error.missing_climate_or_infrastructure";
                return false;
            }
            if (Foreshadows.Count < 2 || Foreshadows.Select(x => x.SensoryFamily).Distinct().Count() < 2)
            {
                reason = "scenario.error.requires_two_independent_foreshadows";
                return false;
            }
            if (Routes.Count < 2 || Routes.Any(x => string.IsNullOrWhiteSpace(x.CostKey) || string.IsNullOrWhiteSpace(x.BenefitKey)))
            {
                reason = "scenario.error.requires_two_visible_routes";
                return false;
            }
            if (string.IsNullOrWhiteSpace(FailureBaselineKey) || string.IsNullOrWhiteSpace(ArchiveOutcomeKey) || string.IsNullOrWhiteSpace(CooldownFamily) || !SupportsLowSensory)
            {
                reason = "scenario.error.missing_aftermath_or_accessibility";
                return false;
            }
            reason = string.Empty;
            return true;
        }

        public bool IsAuthorable(out string reason)
        {
            if (!IsFair(out reason)) return false;
            if (string.IsNullOrWhiteSpace(BoundaryContextKey))
            {
                reason = "scenario.error.missing_boundary_context";
                return false;
            }
            if (Foreshadows.Any(x => x == null || string.IsNullOrWhiteSpace(x.Id) || string.IsNullOrWhiteSpace(x.SensorModeKey) || string.IsNullOrWhiteSpace(x.CaptionKey) || string.IsNullOrWhiteSpace(x.PatternKey) || string.IsNullOrWhiteSpace(x.ConditionKey)))
            {
                reason = "scenario.error.incomplete_foreshadow";
                return false;
            }
            if (Routes.Any(x => x == null || string.IsNullOrWhiteSpace(x.RouteId) || string.IsNullOrWhiteSpace(x.AccessibleSummaryKey) || !x.PreservesResidentAgency))
            {
                reason = "scenario.error.incomplete_or_non_agency_route";
                return false;
            }
            reason = string.Empty;
            return true;
        }
    }

    [Serializable]
    public sealed class ForeshadowDefinition
    {
        public string Id = string.Empty;
        public string SensorModeKey = string.Empty;
        public string SensoryFamily = string.Empty;
        public string CaptionKey = string.Empty;
        public string PatternKey = string.Empty;
        public string ConditionKey = string.Empty;
    }

    [Serializable]
    public sealed class ScenarioRouteDefinition
    {
        public string RouteId = string.Empty;
        public string BenefitKey = string.Empty;
        public string CostKey = string.Empty;
        public string AccessibleSummaryKey = string.Empty;
        public bool PreservesResidentAgency = true;
    }

    public static class CanonicalScenarioCatalog
    {
        public static IReadOnlyList<ScenarioDefinition> Create()
        {
            return new[]
            {
                PrologueOpenDoor(),
                SilverCorridor(),
                UnevenBranchKnock(),
                SunsetWestWall(),
                EmptyInflow(),
                LowExternalTone(),
                ColdFramePattern(),
                BlackoutReturn()
            };
        }

        private static ScenarioDefinition PrologueOpenDoor()
        {
            return CreateBase("prologue.open_door", "climate.dry_continental", "infrastructure.lower_riser_threshold", "baseline.warmed_threshold_with_route_trace", "archive.threshold_route", "cooldown.threshold",
                new[]
                {
                    Foreshadow("cold_front", "sensor.heat", "colour_shape", "caption.cold_rises_from_entrance", "pattern.ascending_cyan", "condition.entrance_air_drop"),
                    Foreshadow("riser_tone", "sensor.vibration", "world_audio", "caption.riser_tone_shifts", "pattern.segmented_pulse", "condition.lower_riser_shift")
                },
                new[]
                {
                    Route("route.direct_lower", "route.direct.benefit.fast_threshold_warmth", "route.direct.cost.branch_26_resonance"),
                    Route("route.quiet_middle", "route.quiet.benefit.preserve_quiet_window", "route.quiet.cost.slower_threshold_recovery")
                });
        }

        private static ScenarioDefinition SilverCorridor()
        {
            return CreateBase("event.silver_corridor", "climate.hot_humid", "infrastructure.kitchen_drain_airflow", "baseline.drain_recovery_required", "archive.silver_corridor", "cooldown.moisture",
                new[]
                {
                    Foreshadow("residual_sheen", "sensor.moisture", "material_pattern", "caption.moisture_remains_after_temperature", "pattern.silver_stipple", "condition.moisture_persists"),
                    Foreshadow("drip_rhythm", "sensor.vibration", "world_audio", "caption.drain_marks_an_extra_beat", "pattern.droplet_caption", "condition.drain_slow")
                },
                new[]
                {
                    Route("route.drain_quiet", "route.drain.benefit.separate_moisture_from_cooling", "route.drain.cost.slower_kitchen_cycle"),
                    Route("route.direct_lower", "route.direct.benefit.fast_air_exchange", "route.direct.cost.network_queue_and_noise")
                });
        }

        private static ScenarioDefinition UnevenBranchKnock()
        {
            return CreateBase("event.uneven_branch_knock", "climate.dry_continental", "infrastructure.branch_26_start_stop", "baseline.branch_recovery_window", "archive.branch_26", "cooldown.vibration",
                new[]
                {
                    Foreshadow("double_click", "sensor.vibration", "world_audio", "caption.branch_clicks_out_of_pair", "pattern.double_tick", "condition.branch_start_stop"),
                    Foreshadow("fragmented_halo", "sensor.vibration", "shape", "caption.branch_halo_breaks_into_segments", "pattern.fractured_ring", "condition.branch_stress")
                },
                new[]
                {
                    Route("route.soft_open", "route.soft_open.benefit.reduce_start_stop", "route.soft_open.cost.delayed_warmth"),
                    Route("route.direct_lower", "route.direct.benefit.immediate_delivery", "route.direct.cost.repeated_branch_stress")
                });
        }

        private static ScenarioDefinition SunsetWestWall()
        {
            return CreateBase("event.warm_wall_after_sunset", "climate.hot_dry", "infrastructure.western_surface", "baseline.surface_debt_visible", "archive.surface_memory", "cooldown.surface",
                new[]
                {
                    Foreshadow("surface_lag", "sensor.surface", "contour", "caption.west_wall_keeps_day_heat", "pattern.dense_amber_contour", "condition.surface_heat_lag"),
                    Foreshadow("late_room_tone", "sensor.heat", "world_audio", "caption.room_tone_stays_warm_after_light", "pattern.sustained_low_tone", "condition.exposure_finished")
                },
                new[]
                {
                    Route("route.quiet_middle", "route.shade.benefit.prepare_buffer_before_peak", "route.shade.cost.lower_immediate_response"),
                    Route("route.direct_lower", "route.cooling.benefit.reduce_air_temperature_now", "route.cooling.cost.misses_surface_debt")
                });
        }

        private static ScenarioDefinition EmptyInflow()
        {
            return CreateBase("event.empty_inflow", "climate.hot_humid", "infrastructure.cooling_lockout_air_route", "baseline.safe_lockout_route_visible", "archive.empty_inflow", "cooldown.lockout",
                new[]
                {
                    Foreshadow("moving_air", "sensor.air", "direction", "caption.air_moves_without_relief", "pattern.long_cyan_thread", "condition.air_without_relief"),
                    Foreshadow("compressor_tone", "sensor.network", "world_audio", "caption.compressor_holds_a_long_tone", "pattern.long_segment", "condition.safe_lockout")
                },
                new[]
                {
                    Route("route.quiet_middle", "route.air.benefit.use_passive_air_route", "route.air.cost.requires_time_and_preparation"),
                    Route("route.direct_lower", "route.direct.benefit.short_active_support", "route.direct.cost.protective_lockout_risk")
                });
        }

        private static ScenarioDefinition LowExternalTone()
        {
            return CreateBase("event.low_external_tone", "climate.wet_windy", "infrastructure.roof_network_front", "baseline.reserve_order_recorded", "archive.external_front", "cooldown.external_front",
                new[]
                {
                    Foreshadow("roof_tone", "sensor.network", "world_audio", "caption.roof_and_network_shift_together", "pattern.low_segmented_hum", "condition.external_front"),
                    Foreshadow("reserve_cells", "sensor.network", "shape", "caption.reserve_cells_dim_before_outage", "pattern.reserve_cell_hatch", "condition.reserve_forecast")
                },
                new[]
                {
                    Route("route.quiet_middle", "route.reserve.benefit.hold_one_meaningful_rhythm", "route.reserve.cost.defer_nonessential_routes"),
                    Route("route.direct_lower", "route.return.benefit.prepare_fast_return", "route.return.cost.surge_risk")
                });
        }

        private static ScenarioDefinition ColdFramePattern()
        {
            return CreateBase("event.cold_frame_pattern", "climate.dry_continental", "infrastructure.window_boundary_surface_lag", "baseline.threshold_buffer_needed", "archive.frame_pattern", "cooldown.boundary",
                new[]
                {
                    Foreshadow("corner_contour", "sensor.surface", "contour", "caption.cold_collects_at_frame_corner", "pattern.angular_cyan", "condition.boundary_loss"),
                    Foreshadow("threshold_air", "sensor.air", "direction", "caption.air_fragments_at_threshold", "pattern.broken_air_thread", "condition.frame_airflow")
                },
                new[]
                {
                    Route("route.soft_open", "route.buffer.benefit.use_threshold_buffer", "route.buffer.cost.longer_preparation"),
                    Route("route.direct_lower", "route.direct.benefit.quickly_raise_room_air", "route.direct.cost.leaves_surface_lag")
                });
        }

        private static ScenarioDefinition BlackoutReturn()
        {
            return CreateBase("event.blackout_return", "climate.blackout_return", "infrastructure.network_staged_return", "baseline.staged_return_follow_up", "archive.staged_return", "cooldown.blackout",
                new[]
                {
                    Foreshadow("network_silence", "sensor.network", "world_audio", "caption.network_rhythm_falls_away", "pattern.empty_segments", "condition.network_loss"),
                    Foreshadow("passive_mass", "sensor.surface", "contour", "caption.surfaces_hold_the_remaining_route", "pattern.stable_surface_hatch", "condition.reserve_mode")
                },
                new[]
                {
                    Route("route.quiet_middle", "route.staged_return.benefit.restore_contours_in_order", "route.staged_return.cost.slower_total_return"),
                    Route("route.direct_lower", "route.all_at_once.benefit.fast_visible_return", "route.all_at_once.cost.second_network_peak")
                });
        }

        private static ScenarioDefinition CreateBase(string id, string profile, string infrastructure, string baseline, string archive, string cooldown, IEnumerable<ForeshadowDefinition> foreshadows, IEnumerable<ScenarioRouteDefinition> routes)
        {
            var scenario = new ScenarioDefinition
            {
                Id = id,
                ClimateProfileId = profile,
                InfrastructureConditionKey = infrastructure,
                FailureBaselineKey = baseline,
                ArchiveOutcomeKey = archive,
                CooldownFamily = cooldown,
                SupportsLowSensory = true
            };
            scenario.Foreshadows.AddRange(foreshadows);
            scenario.Routes.AddRange(routes);
            return scenario;
        }

        private static ForeshadowDefinition Foreshadow(string id, string mode, string family, string caption, string pattern, string condition)
        {
            return new ForeshadowDefinition { Id = id, SensorModeKey = mode, SensoryFamily = family, CaptionKey = caption, PatternKey = pattern, ConditionKey = condition };
        }

        private static ScenarioRouteDefinition Route(string id, string benefit, string cost)
        {
            return new ScenarioRouteDefinition { RouteId = id, BenefitKey = benefit, CostKey = cost, AccessibleSummaryKey = cost, PreservesResidentAgency = true };
        }
    }
}
