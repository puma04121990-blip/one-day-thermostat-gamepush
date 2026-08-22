# Матрица трассируемости

| Каноническое требование | Реализация | Проверка | Release gate |
|---|---|---|---|
| Симуляция не зависит от UI/SDK | `Core/SimulationOrchestrator`, `SimulationWorld` | Core smoke deterministic scenario | EditMode deterministic replay. |
| Fixed authoritative order | `SimulationOrchestrator.Step` | Source review + deterministic test | No direct state writes in presentation/platform. |
| Нормализованные `T/M/A/S/H/E/W/R/B` вместо ложной инженерной точности | `ZoneState`, `ComponentState`, route/load values | Scenario/diagnostic review | UI не показывает ложные градусы/диагнозы. |
| 2 причины максимум | `DiagnosticReasoning` сортирует/обрезает до двух | Core smoke + UI check | На всех event phases. |
| 2 маршрута с ценой | `RoutePreview`, `ScenarioDefinition.Routes` | `ScenarioDefinition.IsFair` | Для каждого authored scenario. |
| Сквозная кампания | `EventDirector`, `CampaignIndex`, three-chain transitions | `CampaignProgressionReachesStagedReturnBaseline` | Порог → Серебро → Возврат завершается recoverable baseline. |
| Journal / результат | `EventState.LastOutcomeKey`, UI Journal/Archive | DTO round-trip + Unity manual pass | Последствие читаемо, сохраняется и не оценивает жильца. |
| Жильцы — агенты | `ResidentRhythmState`, walkthrough boundary table | Narrative/PR review | Нет hidden diagnosis/obedience/command. |
| Добровольная adaptation | `ResidentRhythmSystem` | PlayMode fixture | Не обязательна для успеха. |
| Component wear/hysteresis/recovery | `ComponentStressSystem`, `ComponentState` | EditMode stage/recovery tests | No unrecoverable invisible failure. |
| Save/load/migration | `ThermostatSaveRootDTO`, `SaveCoordinator`, `SaveMapper` | DTO round-trip; corrupt-current/backup fixture | Mid-event/policy states survive. |
| Service follow-up | `ServiceFollowUpSystem`, `ArchiveState.ServiceFollowUps`, typed service command | Core smoke: materialization, resolution, bounded recovery, save round-trip | Последствия ссылаются на компонент, остаются решаемыми и не касаются жилья. |
| End-of-day review | Archive review key в `Cooldown`, Journal/service panel | Three-chain fixture + Unity manual pass | Завершение дня объясняет baseline без score или hard fail. |
| Rules bounded | `PolicyRuleDefinition.IsWellFormed` | Unit test missing `UNTIL` blocks | UI has Preview/Commit parity. |
| Firmware/modifier whitelist | `FirmwareModifierCatalog`, typed selection commands, authoring assets | Core smoke: preview/no mutation, channel mismatch, unknown ID rejection | Нет arbitrary code, unknown selection или bypass Governor. |
| Bounded configuration effect | `TuneReasons`, `ApplyRouteModifier`, player-facing summary | Core smoke: direct boost bounded effect | Максимум две причины и route value остаётся нормализованным. |
| Governor not silent | `SafetyGovernor`, `PolicyPreviewDTO`, Policy Log | Unsafe pulse smoke test | UI displays reason+alternative. |
| WebGL-safe presentation | `ThermostatShowcaseUI`, generated art, CPU snapshot flow | Unity WebGL smoke | No compute shader required. |
| Explicit player start | `UnitySimulationDriver.StartSession`, onboarding overlay | Unity PlayMode start/skip pass | No tick or GameplayStart behind onboarding. |
| Platform pause parity | `GamePlatformBootstrap` + `Time.deltaTime` driver | WebGL pause/resume pass | No authoritative tick advances under platform pause. |
| Non-colour accessibility | Sensor atlas, captions, labels, low-sensory toggle | Manual accessibility run | Critical cue readable with caption only. |
| Local-first GamePush sync | `IGamePlatform`, `ProgressSyncController` | Mock/offline test | Cloud failure cannot lose local state. |
| Consent analytics | `IGamePlatform.Track` gate | Platform mock | No event before consent/after revoke. |
| No monetization pressure | `gamepush.settings.example.json`, decisions | Dashboard/manual review | Ads/payments/leaderboard disabled. |
| Asset provenance | `ASSET_MANIFEST.md` | Release artifact review | No unlicensed/duplicated asset. |

## Minimum fixture set

`CoreSmokeTests` validates deterministic route outcome, protective Governor block, DTO map round-trip, the three-chain campaign through staged return and fairness of the full catalog. Перед публикацией добавьте Unity fixtures для: surface lag, silver corridor moisture, uneven branch start-stop, blackout staged return, save/load each event phase, policy active continuity, corrupt current/backup recovery, GamePush offline fallback и consent revoke.
