using OneDayThermostat.Platform;
using OneDayThermostat.Presentation.UI;
using UnityEngine;

namespace OneDayThermostat.Presentation.Runtime
{
    public static class ThermostatAutoBootstrap
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void CreateShowcaseIfNeeded()
        {
            if (Object.FindFirstObjectByType<UnitySimulationDriver>() != null) return;
            var root = new GameObject("One Day Thermostat — Runtime");
            Object.DontDestroyOnLoad(root);
            root.AddComponent<UnitySimulationDriver>();
            root.AddComponent<GamePlatformBootstrap>();
            root.AddComponent<ProgressSyncController>();
            root.AddComponent<LocalizationProvider>();
            root.AddComponent<ThermostatShowcaseUI>();
        }
    }
}
