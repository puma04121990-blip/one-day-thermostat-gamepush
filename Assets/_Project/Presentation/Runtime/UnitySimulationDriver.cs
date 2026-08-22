using System;
using System.IO;
using OneDayThermostat.Core;
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

        private SimulationWorld _world;
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
            _world.ReducedMotion = reducedMotion;
            _world.LowSensory = lowSensory;
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
            if (paused) Save();
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
            _world.ReducedMotion = reducedMotion;
            _world.LowSensory = lowSensory;
            _lastEventPhase = _world.Event.Phase;
            Publish(_world.CreateSnapshot());
        }

        public void SetAccessibility(bool reducedMotionValue, bool lowSensoryValue)
        {
            reducedMotion = reducedMotionValue;
            lowSensory = lowSensoryValue;
            _world.ReducedMotion = reducedMotion;
            _world.LowSensory = lowSensory;
            Publish(_world.CreateSnapshot());
        }

        private void Publish(SimulationSnapshot snapshot)
        {
            CurrentSnapshot = snapshot;
            SnapshotUpdated?.Invoke(snapshot);
        }
    }
}
