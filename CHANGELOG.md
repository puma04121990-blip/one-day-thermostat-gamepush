# Changelog

Формат основан на принципах Keep a Changelog. Версия `0.1.0` — внутренняя GamePush/WebGL release candidate; её публикация требует выполнения чек-листа из `Docs/RELEASE_CHECKLIST.md`.

## [Unreleased]

### Added

- Связная three-chain кампания: «Порог Аркадия» → «Серебряный коридор» → «Ночной возврат», с recoverable day-complete baseline.
- Сохраняемые поля `CampaignIndex` и `LastOutcomeKey`, динамические routes/Journal/captions в runtime-витрине.
- Детерминированная проверка полной последовательности, Archive outcomes и save round-trip кампании.
- Интерактивный стартовый onboarding, явный `StartSession()` и синхронизация GamePush GameplayStart с действием игрока.
- Корректная остановка fixed-tick симуляции при platform pause.
- Whitelist-каталог firmware/modifiers, typed preview/commit, ограниченный route effect и player-facing configuration summary.

### Planned

| Область | Следующий обязательный шаг |
|---|---|
| GamePush | Подключить официальный plugin к тестовому project ID, включить `GAMEPUSH_SDK` и пройти platform smoke-test. |
| Unity | Открыть проект в зафиксированной Unity 6 версии, проверить package resolve, сцену auto-bootstrap и WebGL build. |
| Контент | Превратить catalog definitions в authorable ScriptableObject instances/fixtures и завершить scripted day sequence. |
| Локализация | Подключить translation loader и пройти expansion/fallback audit. |

## [0.1.0] — 2026-08-22

### Added

- Создан приватный репозиторий `one-day-thermostat-gamepush` с Unity 6/URP skeleton и безопасными Git-правилами.
- Реализовано чистое deterministic ядро: дом, зоны, маршруты, component stress, resident rhythms, event phases, commands и immutable snapshots.
- Добавлены prologue lower/middle route, named explanations, route previews, после-событийный Archive/baseline и no-hard-game-over recovery contract.
- Добавлены policy AST, shared preview/commit evaluator, Safety Governor и Policy Log contract.
- Добавлены версионные DTO, local safe write `tmp → validate → backup → promote`, восстановление newest valid save и persistence smoke coverage.
- Добавлен data-driven catalog канонических dry/wet/surface/blackout сценариев с fairness validation: два независимых foreshadows, два видимых маршрута и low-sensory plan.
- Добавлены `IGamePlatform`, `NullGamePlatform`, условный GamePush adapter, progress mirror, consent-gated analytics/achievements/fullscreen lifecycle.
- Добавлена auto-bootstrapped runtime showcase UI: cutaway, шесть sensor modes, captions, route decisions, policy preview/commit, Archive и accessibility toggles.
- Создан оригинальный visual set: playable house cutaway, key art, sensor atlas и Journal/Archive background; provenance зафиксирован в manifest.
- Добавлены GamePush setup, walkthrough, README, Decisions и проверяемая core smoke-test команда.

### Known limitations

- Unity Editor и официальный GamePush plugin недоступны в текущем sandbox; Unity compile, WebGL build и test-project upload должны быть выполнены владельцем после добавления его локальных platform credentials.
- Нет production WebGL binary в Git: в репозитории намеренно остаются только исходники, метаданные и release instructions.
- Enhanced GPU thermal backend не включён в release path; gameplay использует WebGL-safe CPU-authoritative cutaway path.
