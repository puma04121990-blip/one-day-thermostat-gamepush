using System;
using System.Collections.Generic;
using System.Linq;
using OneDayThermostat.Core;

namespace OneDayThermostat.Gameplay.Automation
{
    public enum ModifierChannel { Sensor, Route }

    public sealed class FirmwareDefinition
    {
        public string Id = string.Empty;
        public string TitleKey = string.Empty;
        public string EffectKey = string.Empty;
        public string TradeoffKey = string.Empty;
        public FirmwareTuning Tuning;

        public bool IsSafe => !string.IsNullOrWhiteSpace(Id)
            && !string.IsNullOrWhiteSpace(TitleKey)
            && !string.IsNullOrWhiteSpace(EffectKey)
            && !string.IsNullOrWhiteSpace(TradeoffKey);
    }

    public sealed class ModifierDefinition
    {
        public string Id = string.Empty;
        public ModifierChannel Channel;
        public string TitleKey = string.Empty;
        public string EffectKey = string.Empty;
        public string TradeoffKey = string.Empty;
        public ModifierTuning Tuning;

        public bool IsSafe => !string.IsNullOrWhiteSpace(Id)
            && !string.IsNullOrWhiteSpace(TitleKey)
            && !string.IsNullOrWhiteSpace(EffectKey)
            && !string.IsNullOrWhiteSpace(TradeoffKey);
    }

    public enum FirmwareTuning { SurfaceMemory, AirFirst, QuietWindow }
    public enum ModifierTuning { EarlyContour, MoistureStipple, SoftOpen, DirectBoost }

    public sealed class ConfigurationPreviewDTO
    {
        public PolicyDecisionStatus Status;
        public string SelectionId = string.Empty;
        public string TitleKey = string.Empty;
        public string EffectKey = string.Empty;
        public string TradeoffKey = string.Empty;
        public string AlternativeKey = string.Empty;
        public ModifierChannel? ModifierChannel;
        public long StaleAtTick;
    }

    public sealed class FirmwareModifierCatalog
    {
        private readonly Dictionary<string, FirmwareDefinition> _firmware = new Dictionary<string, FirmwareDefinition>();
        private readonly Dictionary<string, ModifierDefinition> _modifiers = new Dictionary<string, ModifierDefinition>();

        public FirmwareModifierCatalog()
        {
            AddFirmware("firmware.surface_memory", "firmware.surface_memory.title", "firmware.surface_memory.effect.surface_lag", "firmware.surface_memory.cost.slower_response", FirmwareTuning.SurfaceMemory);
            AddFirmware("firmware.air_first", "firmware.air_first.title", "firmware.air_first.effect.air_foreground", "firmware.air_first.cost.moisture_less_prominent", FirmwareTuning.AirFirst);
            AddFirmware("firmware.quiet_window", "firmware.quiet_window.title", "firmware.quiet_window.effect.rhythm_foreground", "firmware.quiet_window.cost.slower_route_switch", FirmwareTuning.QuietWindow);

            AddModifier("modifier.early_contour", ModifierChannel.Sensor, "modifier.early_contour.title", "modifier.early_contour.effect.surface_contour", "modifier.early_contour.cost.more_surface_signals", ModifierTuning.EarlyContour);
            AddModifier("modifier.moisture_stipple", ModifierChannel.Sensor, "modifier.moisture_stipple.title", "modifier.moisture_stipple.effect.moisture_stipple", "modifier.moisture_stipple.cost.air_signal_less_prominent", ModifierTuning.MoistureStipple);
            AddModifier("modifier.soft_open", ModifierChannel.Route, "modifier.soft_open.title", "modifier.soft_open.effect.cap_direct_open", "modifier.soft_open.cost.slower_threshold_recovery", ModifierTuning.SoftOpen);
            AddModifier("modifier.direct_boost", ModifierChannel.Route, "modifier.direct_boost.title", "modifier.direct_boost.effect.raise_direct_open", "modifier.direct_boost.cost.branch_resonance", ModifierTuning.DirectBoost);
        }

        public IReadOnlyList<FirmwareDefinition> Firmware => _firmware.Values.OrderBy(x => x.Id).ToArray();
        public IReadOnlyList<ModifierDefinition> Modifiers => _modifiers.Values.OrderBy(x => x.Id).ToArray();

        public bool TryGetFirmware(string id, out FirmwareDefinition definition) => _firmware.TryGetValue(id ?? string.Empty, out definition);
        public bool TryGetModifier(string id, out ModifierDefinition definition) => _modifiers.TryGetValue(id ?? string.Empty, out definition);

        public ConfigurationPreviewDTO PreviewFirmware(SimulationWorld world, string id)
        {
            if (!TryGetFirmware(id, out var definition)) return Unknown(id, world.Tick, "configuration.alternative.select_known_firmware");
            if (!definition.IsSafe) return Unsafe(id, world.Tick);
            if (world.Policy.FirmwareId == definition.Id) return Selected(definition, world.Tick);
            return Valid(definition, world.Tick);
        }

        public ConfigurationPreviewDTO PreviewModifier(SimulationWorld world, string id, ModifierChannel channel)
        {
            if (!TryGetModifier(id, out var definition) || definition.Channel != channel) return Unknown(id, world.Tick, "configuration.alternative.select_known_modifier");
            if (!definition.IsSafe) return Unsafe(id, world.Tick);
            var active = channel == ModifierChannel.Sensor ? world.Policy.SensorModifierId : world.Policy.RouteModifierId;
            if (active == definition.Id) return Selected(definition, world.Tick);
            return Valid(definition, world.Tick);
        }

        public bool IsKnownFirmware(string id) => TryGetFirmware(id, out var definition) && definition.IsSafe;
        public bool IsKnownModifier(string id, ModifierChannel channel) => TryGetModifier(id, out var definition) && definition.IsSafe && definition.Channel == channel;

        public void TuneReasons(SimulationWorld world)
        {
            if (TryGetFirmware(world.Policy.FirmwareId, out var firmware))
            {
                for (var index = 0; index < world.LatestReasons.Count; index++)
                {
                    var reason = world.LatestReasons[index];
                    if (firmware.Tuning == FirmwareTuning.SurfaceMemory && reason.Key == "reason.surface_lag") reason.Weight += .22f;
                    if (firmware.Tuning == FirmwareTuning.AirFirst && reason.Key == "reason.external_air_at_threshold") reason.Weight += .22f;
                    if (firmware.Tuning == FirmwareTuning.QuietWindow && reason.Key == "reason.start_stop") reason.Weight += .16f;
                    world.LatestReasons[index] = reason;
                }
            }
            if (TryGetModifier(world.Policy.SensorModifierId, out var sensor))
            {
                for (var index = 0; index < world.LatestReasons.Count; index++)
                {
                    var reason = world.LatestReasons[index];
                    if (sensor.Tuning == ModifierTuning.EarlyContour && reason.Key == "reason.surface_lag") reason.Weight += .12f;
                    if (sensor.Tuning == ModifierTuning.MoistureStipple && reason.Key == "reason.moisture_residual") reason.Weight += .16f;
                    world.LatestReasons[index] = reason;
                }
            }
        }

        public void ApplyRouteModifier(SimulationWorld world, ref SimulationCommand command)
        {
            if (command.Kind != CommandKind.SetRoute || !TryGetModifier(world.Policy.RouteModifierId, out var routeModifier)) return;
            if (routeModifier.Tuning == ModifierTuning.SoftOpen && command.TargetId == "route.direct_lower") command.Value = Math.Min(command.Value, .58f);
            if (routeModifier.Tuning == ModifierTuning.DirectBoost && command.TargetId == "route.direct_lower") command.Value = Math.Min(1f, command.Value + .10f);
        }

        private void AddFirmware(string id, string title, string effect, string tradeoff, FirmwareTuning tuning)
        {
            _firmware[id] = new FirmwareDefinition { Id = id, TitleKey = title, EffectKey = effect, TradeoffKey = tradeoff, Tuning = tuning };
        }

        private void AddModifier(string id, ModifierChannel channel, string title, string effect, string tradeoff, ModifierTuning tuning)
        {
            _modifiers[id] = new ModifierDefinition { Id = id, Channel = channel, TitleKey = title, EffectKey = effect, TradeoffKey = tradeoff, Tuning = tuning };
        }

        private static ConfigurationPreviewDTO Valid(FirmwareDefinition definition, long tick) => new ConfigurationPreviewDTO
        {
            Status = PolicyDecisionStatus.Valid, SelectionId = definition.Id, TitleKey = definition.TitleKey, EffectKey = definition.EffectKey, TradeoffKey = definition.TradeoffKey, StaleAtTick = tick + 1
        };

        private static ConfigurationPreviewDTO Valid(ModifierDefinition definition, long tick) => new ConfigurationPreviewDTO
        {
            Status = PolicyDecisionStatus.Valid, SelectionId = definition.Id, TitleKey = definition.TitleKey, EffectKey = definition.EffectKey, TradeoffKey = definition.TradeoffKey, ModifierChannel = definition.Channel, StaleAtTick = tick + 1
        };

        private static ConfigurationPreviewDTO Selected(FirmwareDefinition definition, long tick)
        {
            var preview = Valid(definition, tick);
            preview.Status = PolicyDecisionStatus.Superseded;
            preview.AlternativeKey = "configuration.already_selected";
            return preview;
        }

        private static ConfigurationPreviewDTO Selected(ModifierDefinition definition, long tick)
        {
            var preview = Valid(definition, tick);
            preview.Status = PolicyDecisionStatus.Superseded;
            preview.AlternativeKey = "configuration.already_selected";
            return preview;
        }

        private static ConfigurationPreviewDTO Unknown(string id, long tick, string alternative) => new ConfigurationPreviewDTO
        {
            Status = PolicyDecisionStatus.Blocked, SelectionId = id ?? string.Empty, AlternativeKey = alternative, EffectKey = "configuration.unknown", StaleAtTick = tick + 1
        };

        private static ConfigurationPreviewDTO Unsafe(string id, long tick) => new ConfigurationPreviewDTO
        {
            Status = PolicyDecisionStatus.Blocked, SelectionId = id ?? string.Empty, AlternativeKey = "configuration.alternative.safe_content_only", EffectKey = "configuration.unsafe_content", StaleAtTick = tick + 1
        };
    }
}
