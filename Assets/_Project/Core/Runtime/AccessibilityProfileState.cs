using System;

namespace OneDayThermostat.Core
{
    [Serializable]
    public sealed class AccessibilityProfileDTO
    {
        public bool ReducedMotion;
        public bool LowSensory;
        public float TextScale = 1f;
        public bool KeyboardHints = true;
    }

    /// <summary>
    /// Player-facing presentation preferences. This state is intentionally separate
    /// from tick rules, commands, routes, components and resident rhythms.
    /// </summary>
    public sealed class AccessibilityProfileState
    {
        public const float MinTextScale = .85f;
        public const float MaxTextScale = 1.35f;

        public bool ReducedMotion;
        public bool LowSensory;
        public float TextScale = 1f;
        public bool KeyboardHints = true;

        public AccessibilityProfileState Clone() => new AccessibilityProfileState
        {
            ReducedMotion = ReducedMotion,
            LowSensory = LowSensory,
            TextScale = ClampTextScale(TextScale),
            KeyboardHints = KeyboardHints
        };

        public AccessibilityProfileDTO ToDto() => new AccessibilityProfileDTO
        {
            ReducedMotion = ReducedMotion,
            LowSensory = LowSensory,
            TextScale = ClampTextScale(TextScale),
            KeyboardHints = KeyboardHints
        };

        public static AccessibilityProfileState FromDto(AccessibilityProfileDTO dto)
        {
            return new AccessibilityProfileState
            {
                ReducedMotion = dto != null && dto.ReducedMotion,
                LowSensory = dto != null && dto.LowSensory,
                TextScale = dto == null ? 1f : ClampTextScale(dto.TextScale),
                KeyboardHints = dto == null || dto.KeyboardHints
            };
        }

        public static float ClampTextScale(float value)
        {
            if (value < MinTextScale) return MinTextScale;
            if (value > MaxTextScale) return MaxTextScale;
            return value;
        }
    }
}
