using System;
using System.IO;
using OneDayThermostat.Core;
using UnityEngine;

namespace OneDayThermostat.Presentation.Runtime
{
    [Serializable]
    public sealed class AccessibilityProfile
    {
        public bool reducedMotion;
        public bool lowSensory;
        public float textScale = 1f;
        public bool keyboardHints = true;

        public AccessibilityProfile Clone()
        {
            var normalized = ToState().Clone();
            return new AccessibilityProfile
            {
                reducedMotion = normalized.ReducedMotion,
                lowSensory = normalized.LowSensory,
                textScale = normalized.TextScale,
                keyboardHints = normalized.KeyboardHints
            };
        }

        public AccessibilityProfileState ToState() => new AccessibilityProfileState
        {
            ReducedMotion = reducedMotion,
            LowSensory = lowSensory,
            TextScale = textScale,
            KeyboardHints = keyboardHints
        };
    }

    public sealed class AccessibilityProfileStore
    {
        private readonly string _path;

        public AccessibilityProfileStore(string rootDirectory)
        {
            _path = Path.Combine(rootDirectory, "accessibility_profile_v1.json");
        }

        public AccessibilityProfile LoadOrDefault(AccessibilityProfile fallback)
        {
            if (!File.Exists(_path)) return (fallback ?? new AccessibilityProfile()).Clone();
            try
            {
                var profile = JsonUtility.FromJson<AccessibilityProfile>(File.ReadAllText(_path));
                return (profile ?? fallback ?? new AccessibilityProfile()).Clone();
            }
            catch
            {
                return (fallback ?? new AccessibilityProfile()).Clone();
            }
        }

        public void Save(AccessibilityProfile profile)
        {
            if (profile == null) return;
            Directory.CreateDirectory(Path.GetDirectoryName(_path));
            File.WriteAllText(_path, JsonUtility.ToJson(profile.Clone(), true));
        }
    }
}
