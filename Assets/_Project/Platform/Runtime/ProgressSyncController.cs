using System.Collections.Generic;
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
        private int _lastLocalAchievementCount;
        private readonly HashSet<string> _dispatchedAchievementsThisSession = new HashSet<string>();

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

            if (snapshot.Archive.UnlockedAchievements.Count != _lastLocalAchievementCount)
            {
                _lastLocalAchievementCount = snapshot.Archive.UnlockedAchievements.Count;
                _driver.Save(); // achievement state is durable before GamePush dispatch
                RetrySync();
            }
            FlushPendingAchievements(snapshot);
        }

        private void FlushPendingAchievements(SimulationSnapshot snapshot)
        {
            if (_platformBootstrap == null || _platformBootstrap.Platform == null || _platformBootstrap.Platform.Readiness != PlatformReadiness.Ready) return;
            foreach (var achievementId in snapshot.Archive.PendingPlatformAchievements)
            {
                if (!_dispatchedAchievementsThisSession.Add(achievementId)) continue;
                _platformBootstrap.Platform.UnlockAchievement(achievementId);
                _platformBootstrap.Platform.Track("achievement_dispatched", achievementId);
            }
        }
    }
}
