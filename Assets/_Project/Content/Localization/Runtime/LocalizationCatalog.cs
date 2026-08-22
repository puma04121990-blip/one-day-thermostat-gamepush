using System;
using System.Collections.Generic;
using System.Linq;

namespace OneDayThermostat.Content.Localization
{
    [Serializable]
    public sealed class LocalizationEntry
    {
        public string key = string.Empty;
        public string value = string.Empty;
    }

    [Serializable]
    public sealed class LocalizationDocument
    {
        public string locale = string.Empty;
        public LocalizationEntry[] entries = Array.Empty<LocalizationEntry>();
    }

    public sealed class LocalizationValidation
    {
        public readonly List<string> Errors = new List<string>();
        public bool IsValid => Errors.Count == 0;
    }

    public sealed class LocalizationCatalog
    {
        private readonly Dictionary<string, string> _primary;
        private readonly Dictionary<string, string> _fallback;
        public string Locale { get; }

        private LocalizationCatalog(string locale, Dictionary<string, string> primary, Dictionary<string, string> fallback)
        {
            Locale = locale;
            _primary = primary;
            _fallback = fallback;
        }

        public static LocalizationCatalog Create(LocalizationDocument primary, LocalizationDocument fallback, out LocalizationValidation validation)
        {
            validation = new LocalizationValidation();
            var primaryEntries = BuildMap(primary, "primary", validation);
            var fallbackEntries = BuildMap(fallback, "fallback", validation);
            if (primary == null || string.IsNullOrWhiteSpace(primary.locale)) validation.Errors.Add("localization.error.primary_locale_missing");
            if (fallback == null || string.IsNullOrWhiteSpace(fallback.locale)) validation.Errors.Add("localization.error.fallback_locale_missing");
            return new LocalizationCatalog(primary != null ? primary.locale : string.Empty, primaryEntries, fallbackEntries);
        }

        public string Resolve(string key)
        {
            if (string.IsNullOrWhiteSpace(key)) return "[[localization.empty_key]]";
            if (_primary.TryGetValue(key, out var primary)) return primary;
            if (_fallback.TryGetValue(key, out var fallback)) return fallback;
            return "[[" + key + "]]";
        }

        public bool HasPrimary(string key) => _primary.ContainsKey(key ?? string.Empty);
        public bool HasAny(string key) => _primary.ContainsKey(key ?? string.Empty) || _fallback.ContainsKey(key ?? string.Empty);

        public LocalizationValidation ValidateCoverage(IEnumerable<string> requiredKeys)
        {
            var validation = new LocalizationValidation();
            foreach (var key in (requiredKeys ?? Array.Empty<string>()).Where(x => !string.IsNullOrWhiteSpace(x)).Distinct())
            {
                if (!HasAny(key)) validation.Errors.Add("localization.error.missing_key:" + key);
            }
            return validation;
        }

        private static Dictionary<string, string> BuildMap(LocalizationDocument document, string name, LocalizationValidation validation)
        {
            var map = new Dictionary<string, string>();
            if (document == null) return map;
            foreach (var entry in document.entries ?? Array.Empty<LocalizationEntry>())
            {
                if (entry == null || string.IsNullOrWhiteSpace(entry.key) || string.IsNullOrWhiteSpace(entry.value))
                {
                    validation.Errors.Add("localization.error.invalid_" + name + "_entry");
                    continue;
                }
                if (map.ContainsKey(entry.key))
                {
                    validation.Errors.Add("localization.error.duplicate_" + name + "_key:" + entry.key);
                    continue;
                }
                map[entry.key] = entry.value;
            }
            return map;
        }
    }
}
