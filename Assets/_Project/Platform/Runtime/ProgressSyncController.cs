using OneDayThermostat.Core;
using OneDayThermostat.Presentation.Runtime;
using UnityEngine;

namespace OneDayThermostat.Platform
{
    [RequireComponent(typeof(UnitySimulationDriver))]
    [RequireComponent(typeof(GamePlatformBootstrap))]
    public sealed class ProgressSyncController : MonoBehaviour
    {
        private const string ProgressKey = "one_day_thermostat_slot_00_v1";
        private UnitySimulationDriver _driver;
        private GamePlatformBootstrap _platformBootstrap;
        private EventPhase _lastPhase;
        private bool _firstFlowSynced;
        private bool _quietRouteSynced;

        private void Awake()
        {
            _driver = GetComponent<UnitySimulationDriver>();
            _platformBootstrap = GetComponent<GamePlatformBootstrap>();
            _driver.SnapshotUpdated += OnSnapshot;
        }

        private void OnDestroy()
        {
            if (_driver != null) _driver.SnapshotUpdated -= OnSnapshot;
        }

        public void SetTelemetryConsent(bool granted)
        {
            _platformBootstrap.Platform.SetTelemetryConsent(granted);
        }

        public void RetrySync()
        {
            var payload = _driver.ExportValidatedSaveJson();
            if (!string.IsNullOrEmpty(payload)) _platformBootstrap.Platform.SaveProgress(ProgressKey, payload);
        }

        private void OnSnapshot(SimulationSnapshot snapshot)
        {
            if (snapshot.Event.Phase != _lastPhase)
            {
                _lastPhase = snapshot.Event.Phase;
                _driver.Save(); // local safety precedes platform mirror
                RetrySync();
                _platformBootstrap.Platform.Track("component_stage_changed", snapshot.Event.Phase.ToString());
            }

            if (!_firstFlowSynced && snapshot.Archive.UnlockedEntries.Contains("archive.threshold_route"))
            {
                _firstFlowSynced = true;
                _platformBootstrap.Platform.UnlockAchievement("archive_first_flow");
                _platformBootstrap.Platform.Track("route_committed", "threshold_route");
            }

            if (!_quietRouteSynced && snapshot.Archive.UnlockedEntries.Contains("archive.quiet_route"))
            {
                _quietRouteSynced = true;
                _platformBootstrap.Platform.UnlockAchievement("archive_quiet_route");
                _platformBootstrap.Platform.Track("resident_adaptation_available", "quiet_route_context");
            }
        }
    }
}
