using System;
using System.IO;
using OneDayThermostat.Core;
using OneDayThermostat.Gameplay.Automation;
using UnityEngine;

namespace OneDayThermostat.Presentation.Runtime
{
    public sealed class UnityJsonSaveSerializer : ISaveSerializer
    {
        public string Serialize(ThermostatSaveRootDTO root) => JsonUtility.ToJson(root, true);
        public ThermostatSaveRootDTO Deserialize(string raw) => JsonUtility.FromJson<ThermostatSaveRootDTO>(raw);
    }

    public sealed class UnitySimulationDriver : MonoBehaviour
    {
        [SerializeField] private string slotId = "slot_00";
        [SerializeField] private int scenarioSeed = 20260822;
        [SerializeField] private bool autoSaveAtEventBoundary = true;
        [SerializeField] private bool reducedMotion;
        [SerializeField] private bool lowSensory;
        [SerializeField] [Range(.85f, 1.35f)] private float textScale = 1f;
        [SerializeField] private bool keyboardHints = true;

        private SimulationWorld _world;
        private AccessibilityProfileStore _accessibilityProfiles;
        public AccessibilityProfile Accessibility { get; private set; }
        private SimulationOrchestrator _orchestrator;
        private SaveCoordinator _saves;
        private float _accumulator;
        private EventPhase _lastEventPhase;

        public SimulationSnapshot CurrentSnapshot { get; private set; }
        public bool IsSessionStarted { get; private set; }
        public event Action<SimulationSnapshot> SnapshotUpdated;
        public event Action SessionStarted;

        private void Awake()
        {
            _world = SimulationWorld.CreatePrologue(scenarioSeed);
            _accessibilityProfiles = new AccessibilityProfileStore(Application.persistentDataPath);
            Accessibility = _accessibilityProfiles.LoadOrDefault(new AccessibilityProfile { reducedMotion = reducedMotion, lowSensory = lowSensory, textScale = textScale, keyboardHints = keyboardHints });
            ApplyAccessibilityToWorld();
            _orchestrator = new SimulationOrchestrator();
            _saves = new SaveCoordinator(new FileSaveStorage(), new UnityJsonSaveSerializer(), Application.persistentDataPath);
            _orchestrator.SnapshotPublished += Publish;
            _lastEventPhase = _world.Event.Phase;
            Publish(_world.CreateSnapshot());
        }

        private void Update()
        {
            if (!IsSessionStarted) return;
            _accumulator += Time.deltaTime;
            while (_accumulator >= SimulationOrchestrator.TickSeconds)
            {
                _accumulator -= SimulationOrchestrator.TickSeconds;
                _orchestrator.Step(_world);
                if (autoSaveAtEventBoundary && _world.Event.Phase != _lastEventPhase)
                {
                    Save();
                    _lastEventPhase = _world.Event.Phase;
                }
            }
        }

        private void OnApplicationPause(bool paused)
        {
            if (paused)
            {
                Save();
                SaveAccessibilityProfile();
            }
        }

        private void OnApplicationFocus(bool focused)
        {
            if (!focused)
            {
                Save();
                SaveAccessibilityProfile();
                return;
            }
            _accumulator = 0f; // no catch-up ticks after a platform overlay or browser resume
            if (_world != null) Publish(_world.CreateSnapshot());
        }

        public void StartSession()
        {
            if (IsSessionStarted) return;
            IsSessionStarted = true;
            _accumulator = 0f;
            SessionStarted?.Invoke();
            Publish(_world.CreateSnapshot());
        }

        public void SetRoute(string routeId, float openness)
        {
            _orchestrator.Enqueue(_world, new SimulationCommand { Kind = CommandKind.SetRoute, TargetId = routeId, Value = openness, Source = "player" });
        }

        public void UseRecovery(string componentId)
        {
            _orchestrator.Enqueue(_world, new SimulationCommand { Kind = CommandKind.Recover, TargetId = componentId, Value = 1f, Source = "player" });
        }

        public ConfigurationPreviewDTO PreviewFirmware(string firmwareId) => _orchestrator.PreviewFirmware(_world, firmwareId);

        public ConfigurationPreviewDTO PreviewModifier(string modifierId, ModifierChannel channel) => _orchestrator.PreviewModifier(_world, modifierId, channel);

        public void CompleteServiceFollowUp(string followUpId)
        {
            _orchestrator.Enqueue(_world, new SimulationCommand { Kind = CommandKind.CompleteServiceFollowUp, TargetId = followUpId, Value = 1f, Source = "player" });
        }

        public void SelectFirmware(string firmwareId)
        {
            _orchestrator.Enqueue(_world, new SimulationCommand { Kind = CommandKind.SelectFirmware, TargetId = firmwareId, Value = 1f, Source = "player" });
        }

        public void SelectModifier(string modifierId, ModifierChannel channel)
        {
            var kind = channel == ModifierChannel.Sensor ? CommandKind.SelectSensorModifier : CommandKind.SelectRouteModifier;
            _orchestrator.Enqueue(_world, new SimulationCommand { Kind = kind, TargetId = modifierId, Value = 1f, Source = "player" });
        }

        public PolicyPreviewDTO PreviewPolicy(string ruleId) => _orchestrator.PreviewPolicy(_world, ruleId);

        public void CommitPolicy(string ruleId)
        {
            _orchestrator.Enqueue(_world, new SimulationCommand { Kind = CommandKind.CommitPolicy, TargetId = ruleId, Value = 1f, Source = "player" });
        }

        public void Save()
        {
            if (_world == null || _saves == null) return;
            _saves.Save(_world, slotId, Application.version);
        }

        public string ExportValidatedSaveJson()
        {
            if (_world == null) return string.Empty;
            var dto = SaveMapper.ToDto(_world, slotId, Application.version);
            return JsonUtility.ToJson(dto);
        }

        public void Load()
        {
            _world = _saves.LoadNewestValid(slotId);
            ApplyAccessibilityToWorld();
            _lastEventPhase = _world.Event.Phase;
            Publish(_world.CreateSnapshot());
        }

        public void SetAccessibility(bool reducedMotionValue, bool lowSensoryValue)
        {
            if (Accessibility == null) Accessibility = new AccessibilityProfile();
            Accessibility.reducedMotion = reducedMotionValue;
            Accessibility.lowSensory = lowSensoryValue;
            ApplyAccessibilityToWorld();
            SaveAccessibilityProfile();
            Publish(_world.CreateSnapshot());
        }

        public void SetTextScale(float scale)
        {
            if (Accessibility == null) Accessibility = new AccessibilityProfile();
            Accessibility.textScale = AccessibilityProfileState.ClampTextScale(scale);
            SaveAccessibilityProfile();
        }

        public void SetKeyboardHints(bool enabled)
        {
            if (Accessibility == null) Accessibility = new AccessibilityProfile();
            Accessibility.keyboardHints = enabled;
            SaveAccessibilityProfile();
        }

        private void ApplyAccessibilityToWorld()
        {
            if (Accessibility == null || _world == null) return;
            reducedMotion = Accessibility.reducedMotion;
            lowSensory = Accessibility.lowSensory;
            textScale = Accessibility.textScale;
            keyboardHints = Accessibility.keyboardHints;
            _world.ReducedMotion = reducedMotion;
            _world.LowSensory = lowSensory;
        }

        private void SaveAccessibilityProfile()
        {
            if (_accessibilityProfiles != null && Accessibility != null) _accessibilityProfiles.Save(Accessibility);
        }

        private void Publish(SimulationSnapshot snapshot)
        {
            CurrentSnapshot = snapshot;
            SnapshotUpdated?.Invoke(snapshot);
        }
    }
}
