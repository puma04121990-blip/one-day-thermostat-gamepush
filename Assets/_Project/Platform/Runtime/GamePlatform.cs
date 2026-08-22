using System;
using System.Collections.Generic;
using UnityEngine;

namespace OneDayThermostat.Platform
{
    public enum PlatformReadiness { Initializing, Ready, OfflineFallback, Failed }

    public interface IGamePlatform
    {
        PlatformReadiness Readiness { get; }
        bool TelemetryConsent { get; }
        event Action Paused;
        event Action Resumed;
        void Initialize(Action onReady = null, Action<string> onFallback = null);
        void SaveProgress(string key, string value, Action onComplete = null);
        void LoadProgress(string key, Action<string> onComplete, Action onUnavailable = null);
        void UnlockAchievement(string tag);
        void Track(string eventName, string value = "1");
        void SetTelemetryConsent(bool granted);
        void OpenFullscreen();
        void NotifyGameplayStarted();
        void NotifyGameplayStopped();
    }

    public sealed class NullGamePlatform : IGamePlatform
    {
        private readonly Dictionary<string, string> _memory = new Dictionary<string, string>();
        public PlatformReadiness Readiness { get; private set; } = PlatformReadiness.Initializing;
        public bool TelemetryConsent { get; private set; }
        public event Action Paused;
        public event Action Resumed;

        public void Initialize(Action onReady = null, Action<string> onFallback = null)
        {
            Readiness = PlatformReadiness.OfflineFallback;
            onFallback?.Invoke("platform.local_fallback");
            onReady?.Invoke();
        }
        public void SaveProgress(string key, string value, Action onComplete = null) { _memory[key] = value; onComplete?.Invoke(); }
        public void LoadProgress(string key, Action<string> onComplete, Action onUnavailable = null)
        {
            if (_memory.TryGetValue(key, out var value)) onComplete?.Invoke(value); else onUnavailable?.Invoke();
        }
        public void UnlockAchievement(string tag) { }
        public void Track(string eventName, string value = "1") { }
        public void SetTelemetryConsent(bool granted) => TelemetryConsent = granted;
        public void OpenFullscreen() { }
        public void NotifyGameplayStarted() { }
        public void NotifyGameplayStopped() { }
        public void RaisePause() => Paused?.Invoke();
        public void RaiseResume() => Resumed?.Invoke();
    }

    public sealed class GamePushPlatformAdapter : IGamePlatform
    {
        private readonly NullGamePlatform _fallback = new NullGamePlatform();
        public PlatformReadiness Readiness { get; private set; } = PlatformReadiness.Initializing;
        public bool TelemetryConsent { get; private set; }
        public event Action Paused;
        public event Action Resumed;

        public void Initialize(Action onReady = null, Action<string> onFallback = null)
        {
#if GAMEPUSH_SDK
            try
            {
                GamePush.GP_Init.OnReady += HandleReady;
                GamePush.GP_Game.OnPause += HandlePause;
                GamePush.GP_Game.OnResume += HandleResume;
                void HandleReady()
                {
                    Readiness = PlatformReadiness.Ready;
                    GamePush.GP_Game.GameReady();
                    onReady?.Invoke();
                    GamePush.GP_Init.OnReady -= HandleReady;
                }
                void HandlePause() => Paused?.Invoke();
                void HandleResume() => Resumed?.Invoke();
            }
            catch (Exception exception)
            {
                UseFallback($"platform.gamepush_init_error:{exception.GetType().Name}", onReady, onFallback);
            }
#else
            UseFallback("platform.gamepush_sdk_not_installed", onReady, onFallback);
#endif
        }

        public void SaveProgress(string key, string value, Action onComplete = null)
        {
#if GAMEPUSH_SDK
            if (Readiness == PlatformReadiness.Ready)
            {
                GamePush.GP_Storage.Set(key, value, _ => onComplete?.Invoke());
                return;
            }
#endif
            _fallback.SaveProgress(key, value, onComplete);
        }

        public void LoadProgress(string key, Action<string> onComplete, Action onUnavailable = null)
        {
#if GAMEPUSH_SDK
            if (Readiness == PlatformReadiness.Ready)
            {
                GamePush.GP_Storage.Get(key, value => onComplete?.Invoke(value?.ToString()));
                return;
            }
#endif
            _fallback.LoadProgress(key, onComplete, onUnavailable);
        }

        public void UnlockAchievement(string tag)
        {
#if GAMEPUSH_SDK
            if (Readiness == PlatformReadiness.Ready) GamePush.GP_Achievements.Unlock(tag);
#endif
        }

        public void Track(string eventName, string value = "1")
        {
            if (!TelemetryConsent) return;
#if GAMEPUSH_SDK
            if (Readiness == PlatformReadiness.Ready) GamePush.GP_Analytics.Goal(eventName, value);
#endif
        }

        public void SetTelemetryConsent(bool granted) => TelemetryConsent = granted;

        public void OpenFullscreen()
        {
#if GAMEPUSH_SDK
            if (Readiness == PlatformReadiness.Ready) GamePush.GP_Fullscreen.Open();
#endif
        }

        public void NotifyGameplayStarted()
        {
#if GAMEPUSH_SDK
            if (Readiness == PlatformReadiness.Ready) GamePush.GP_Game.GameplayStart();
#endif
        }

        public void NotifyGameplayStopped()
        {
#if GAMEPUSH_SDK
            if (Readiness == PlatformReadiness.Ready) GamePush.GP_Game.GameplayStop();
#endif
        }

        private void UseFallback(string reason, Action onReady, Action<string> onFallback)
        {
            _fallback.Initialize(() =>
            {
                Readiness = PlatformReadiness.OfflineFallback;
                onFallback?.Invoke(reason);
                onReady?.Invoke();
            });
        }
    }

    public sealed class GamePlatformBootstrap : MonoBehaviour
    {
        [SerializeField] private bool useGamePushWhenInstalled = true;
        [SerializeField] private bool telemetryConsent;
        public IGamePlatform Platform { get; private set; }

        private void Awake()
        {
            Platform = useGamePushWhenInstalled ? (IGamePlatform)new GamePushPlatformAdapter() : new NullGamePlatform();
            Platform.SetTelemetryConsent(telemetryConsent);
            Platform.Paused += () => Time.timeScale = 0f;
            Platform.Resumed += () => Time.timeScale = 1f;
            Platform.Initialize(() => Platform.NotifyGameplayStarted(), Debug.LogWarning);
        }

        private void OnDestroy() => Platform?.NotifyGameplayStopped();
    }
}
