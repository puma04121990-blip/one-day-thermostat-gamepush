using OneDayThermostat.Content.Localization;
using UnityEngine;

namespace OneDayThermostat.Presentation.Runtime
{
    public sealed class LocalizationProvider : MonoBehaviour
    {
        [SerializeField] private string preferredLocale = "ru-RU";
        private static LocalizationCatalog _catalog;
        private static bool _initialized;

        public static string Resolve(string key)
        {
            EnsureInitialized();
            return _catalog.Resolve(key);
        }

        public static bool HasAny(string key)
        {
            EnsureInitialized();
            return _catalog.HasAny(key);
        }

        private void Awake()
        {
            if (!_initialized) Initialize(preferredLocale);
        }

        private static void EnsureInitialized()
        {
            if (!_initialized) Initialize("ru-RU");
        }

        private static void Initialize(string locale)
        {
            var primary = Resources.Load<TextAsset>("Localization/" + (locale == "en-US" ? "en" : "ru"));
            var fallback = Resources.Load<TextAsset>("Localization/en");
            var primaryDocument = primary != null ? JsonUtility.FromJson<LocalizationDocument>(primary.text) : new LocalizationDocument { locale = locale };
            var fallbackDocument = fallback != null ? JsonUtility.FromJson<LocalizationDocument>(fallback.text) : new LocalizationDocument { locale = "en-US" };
            _catalog = LocalizationCatalog.Create(primaryDocument, fallbackDocument, out _);
            _initialized = true;
        }
    }
}
