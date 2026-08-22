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
- Archive/service follow-up: материальные последствия, безопасное обслуживание компонента, end-of-day review и save round-trip service state.
- Typed ru-RU/en-US localization catalog, runtime fallback, semantic content manifest и CI-проверка JSON parity/Resources sync.
- Data-driven achievement progression, local-first pending GamePush dispatch, player-facing achievement strip и save-persisted unlock state.
- Local-first accessibility profile: reduced motion, low-sensory, keyboard hints и bounded text scale `85–135%`, сохраняемые отдельно от slot save.
- Keyboard shortcuts и uGUI focus start после onboarding; text scale controls с labelled fallback.
- Platform pause overlay и focus-return path без catch-up ticks; pause/focus сохраняют текущий slot и accessibility profile.
- Pure-core accessibility state и smoke coverage: bounded text scale и отсутствие влияния presentation preferences на physics/component/event outcome.
- Authorable `ScenarioDefinitionAsset → ScenarioDefinition` bridge и строгий `IsAuthorable()` contract: boundary context, complete foreshadows, accessible route summary и resident agency.
- `ScriptedDayFixtureAsset` и pure canonical `fixture.careful_three_chain_day`: bounded player-command sequence, Archive outcomes и recoverable day baseline без authority bypass.
- Manifest safety расширена на scenario authoring и fixture references; CI smoke coverage включает invalid authoring contract и scripted day parity.

### Planned

| Область | Следующий обязательный шаг |
|---|---|
| GamePush | Подключить официальный plugin к тестовому project ID, включить `GAMEPUSH_SDK` и пройти platform smoke-test. |
| Unity | Открыть проект в зафиксированной Unity 6 версии, проверить package resolve, сцену auto-bootstrap и WebGL build. |
| Контент | Превратить catalog definitions в authorable ScriptableObject instances/fixtures и завершить scripted day sequence. |
| Локализация | Подключить translation loader и пройти expansion/fallback audit. |
| Доступность | Выполнить Unity device/layout matrix для keyboard/controller/touch, `85–135%` текста и persistent profile. |
| WebGL lifecycle | В GamePush test project подтвердить pause overlay, отсутствие tick/catch-up при resume и restart persistence. |
| Scenario authoring | В Unity создать и проверить inspector-authored Scenario/Scripted Day Fixture assets через Content Manifest и PlayMode evidence. |
| Browser parity | Перенести remaining firmware/modifier catalog, service follow-up execution, content versioning и GamePush browser mirror без возврата Unity как player requirement. |

### Browser Edition

- Основной playable путь перенесён на Phaser `3.90.0` + React/TypeScript в `browser/`; игроку для запуска больше не нужны Unity Editor, Git или GamePush credentials.
- Добавлен fixed-tick `ThermostatSimulation`, Phaser cutaway scene, local-first browser save, Archive, three-chain route flow, onboarding и доступный browser profile.
- Browser-specific GitHub CI проверяет `pnpm check` и `pnpm build` при изменениях в `browser/`.
- Unity 6 прототип сохранён как legacy reference до завершения document parity audit; он не объявляется обязательным для browser release.

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
