# «Один день термостата»

> **Атмосферная системная браузерная игра о доме, который читается через тепло, воздух, влагу, износ и ритмы, а не через контроль над людьми.**

«Один день термостата» — однопользовательская narrative systems game на **Phaser 3 + TypeScript**. Игрок является старым настенным термостатом Т‑3: он неподвижен, но видит дом в разрезе и создаёт бережные маршруты до того, как материальные следы становятся кризисом. Основная поставка теперь — **лёгкий browser-first клиент**: игрок открывает ссылку и играет без Unity, Git, WebGL build или GamePush credentials.

| Характеристика | Решение |
|---|---|
| Движок | Phaser `3.90.0` + React + TypeScript |
| Целевая поставка | Прямая браузерная ссылка; GamePush browser adapter — последующий этап |
| Авторитетная логика | Изолированный TypeScript fixed-tick core `5 Hz` |
| Визуальный backend релиза | Phaser cutaway canvas + доступный HTML overlay |
| Язык первой версии | Русский, с semantic localization keys |
| Сохранения | Local-first `localStorage` day state и отдельный accessibility profile |
| Платформенный слой | Browser fallback сейчас; idempotent GamePush mirror после test project |

## Канон и игровой контракт

Главный принцип проекта прост: **игрок оптимизирует маршруты дома, а не людей**. Жильцы остаются агентами со своими наблюдаемыми ритмами, предпочтениями среды и добровольными адаптациями. В игре нет скрытой шкалы «послушания», диагнозов, механики принуждения или наград за «исправление» человека.

Перед существенным последствием игрок всегда должен иметь возможность ответить на три вопроса: **что меняется**, **почему** (не более двух объяснений) и **что можно сделать и чем заплатить** (минимум два видимых маршрута). Кризис не возникает от непрозрачного броска: он строится из климата, инфраструктуры, двух независимых предвестников, вариантов ответа и нового baseline/recovery после ошибки.

| Слой | Пример |
|---|---|
| L0 — мир | Тёплая поверхность, холод у двери, капли, ритм труб, шаги |
| L1 — сенсор | Heat, Air, Vibration, Moisture, Network, Surface |
| L2 — диагностика | Источник, изменение, максимум две причины, прогноз и два маршрута |
| L3 — память | Journal of Stewardship, Archive, Policy Log, service trace |

## Браузерная версия — запуск за минуту

Исходники основной playable версии находятся в [`browser/`](browser/). Для игрока после публикации достаточно URL. Для локальной разработки нужны только Node.js и pnpm:

```bash
git clone https://github.com/puma04121990-blip/one-day-thermostat-gamepush.git
cd one-day-thermostat-gamepush/browser
pnpm install
pnpm dev
```

Откройте адрес Vite. Клавиши `Q` / `E` выбирают доступные маршруты, `J` открывает Archive, `L` включает low-sensory, `M` — reduced motion. Все действия дублированы кнопками. Подробная browser architecture и правила local-first пути лежат в [`browser/README.md`](browser/README.md) и [`browser/ARCHITECTURE.md`](browser/ARCHITECTURE.md).

## Legacy Unity reference

В `Assets/` сохранён прежний Unity 6 прототип как **legacy reference** для переносимых content contracts и ранее сделанной работы. Он не нужен игроку для теста браузерной версии и не является основным способом поставки. Перед окончательным удалением Unity-кода remaining content/save contracts будут перенесены и покрыты browser tests.

| Каталог | Содержимое |
|---|---|
| `Assets/_Project/Core` | Модель дома, fixed-tick orchestrator, snapshots, команды, save DTO и safe-write coordinator |
| `Assets/_Project/Gameplay` | Climate/wear/event/rhythm systems, policy AST, Safety Governor и diagnostics |
| `Assets/_Project/Presentation` | Unity driver, cutaway/UI, local-first accessibility profile и platform pause overlay |
| `Assets/_Project/Platform` | `IGamePlatform`, local fallback и GamePush adapter под compile symbol `GAMEPUSH_SDK` |
| `Assets/_Project/Tests` | Smoke-test детерминизма, Governor и save mapping; Unity tests/fixtures расширяются по мере контента |
| `Docs` | Архитектура, GamePush setup, контентные схемы, traceability, QA и release gates |

## Подключение GamePush

Browser Edition запускается без GamePush и без credentials. Текущий localStorage save остаётся источником восстановления; будущий browser adapter будет только зеркалировать локально подтверждённые achievement/progression safe points. Для фактического подключения нужны GamePush test project и официальный browser SDK; до этого момента в репозиторий не добавляются токены, фальшивые API calls или платформа как authoritative источник.

| Функция | Поведение |
|---|---|
| Game ready/lifecycle | Будет сообщаться только после readiness browser SDK; platform pause не должна создавать catch-up ticks |
| Прогресс | Local save является источником восстановления; mirror отправляется после локального safe point |
| Achievements | Только Archive/бережность: профилактика, recovery и прозрачные policy, без механического преимущества |
| Analytics | Только после явного согласия; события описывают понимание причинности, а не личные данные |
| Ads/purchases/leaderboards | Отключены в первом релизе; не допустимы во время кризиса и не дают power advantage |

Подробные шаги, ограничения и smoke-test находятся в [`Docs/GAMEPUSH_SETUP.md`](Docs/GAMEPUSH_SETUP.md).

## Проверка ядра без Unity

В окружении разработки можно проверить чистый C#-слой через Mono. Эта проверка не заменяет Unity EditMode/PlayMode/WebGL test pass, но даёт быстрый воспроизводимый сигнал для детерминизма и data contracts.

```bash
mcs -langversion:latest -out:/tmp/one-day-thermostat-core-tests.exe \
  Assets/_Project/Core/Runtime/ThermostatDomain.cs \
  Assets/_Project/Core/Runtime/AccessibilityProfileState.cs \
  Assets/_Project/Core/Runtime/SimulationWorld.cs \
  Assets/_Project/Core/Runtime/SimulationOrchestrator.cs \
  Assets/_Project/Core/Runtime/SaveContract.cs \
  Assets/_Project/Gameplay/Climate/AuthoritativeSystems.cs \
  Assets/_Project/Gameplay/Climate/ServiceFollowUpSystem.cs \
  Assets/_Project/Gameplay/Automation/AutomationAndDiagnostics.cs \
  Assets/_Project/Gameplay/Automation/FirmwareModifierCatalog.cs \
  Assets/_Project/Gameplay/Progression/AchievementProgression.cs \
  Assets/_Project/Content/Localization/Runtime/LocalizationCatalog.cs \
  Assets/_Project/Content/Runtime/ScenarioDefinitions.cs \
  Assets/_Project/Tests/EditMode/CoreSmokeTests.cs && \
mono /tmp/one-day-thermostat-core-tests.exe
```

Ожидаемый результат: `CORE_SMOKE_TESTS: PASS`.

## Качество, доступность и завершённость

Ни один значимый сигнал не должен существовать только в цвете, звуке или движении: обязательны label, pattern/shape, caption и canonical text. Low-sensory выключает несущественные motion/слои звука, но не удаляет предвестник или решение. Любая automation rule требует `WHEN / IF / THEN / UNTIL / SHOW`; Preview использует тот же evaluator, что и commit, а Governor обязан объяснить блок и предложить безопасную альтернативу.

Полный checklist, миграции, тесты, content schema и Definition of Done перечислены в [`Docs/`](Docs/). Сценарный маршрут, player-facing цены и ожидаемый новый baseline описаны в [`Docs/VERTICAL_SLICE.md`](Docs/VERTICAL_SLICE.md). Unity authoring bridge, material scenario contract и проверяемый scripted day fixture описаны в [`Docs/SCRIPTED_DAY_FIXTURES.md`](Docs/SCRIPTED_DAY_FIXTURES.md). Безопасный preview/commit контур firmware и modifiers описан в [`Docs/FIRMWARE_MODIFIERS.md`](Docs/FIRMWARE_MODIFIERS.md). Материальные последствия, service follow-up и end-of-day review описаны в [`Docs/SERVICE_FOLLOW_UP.md`](Docs/SERVICE_FOLLOW_UP.md). Typed локализация, semantic content keys и authoring workflow описаны в [`Docs/LOCALIZATION_AND_CONTENT.md`](Docs/LOCALIZATION_AND_CONTENT.md). Сохраняемые accessibility preferences, keyboard shortcuts, focus contract и pause/resume/restart behaviour описаны в [`Docs/ACCESSIBILITY_PROFILES.md`](Docs/ACCESSIBILITY_PROFILES.md). Data-driven достижения, local-first pending sync и GamePush lifecycle описаны в [`Docs/ACHIEVEMENTS_AND_GAMEPUSH.md`](Docs/ACHIEVEMENTS_AND_GAMEPUSH.md). Правила CI и статус серверной защиты основной ветки описаны в [`Docs/GITHUB_GOVERNANCE.md`](Docs/GITHUB_GOVERNANCE.md). Неподтверждённые метрики, коммерческие ожидания и pitches из исходной документации не трактуются как фактические обещания продукта.

## Лицензирование и секреты

Исходники размещены в публично доступном репозитории, но до отдельного выбора владельцем юридической модели распространения применяется **All Rights Reserved**. Публичная видимость не предоставляет разрешение на повторное использование, распространение или создание производных работ. Не добавляйте в commits GamePush credentials, локальные player saves, WebGL build output, Unity `Library/` или профилировочные captures. Права и происхождение каждого нового визуального/звукового ассета фиксируются в asset manifest.

## Ссылки

[GamePush: Unity-плагин](https://github.com/GamePushService/GamePush-Unity-plugin) · [GamePush: начало работы](https://docs.gamepush.com/docs/get-start/) · [GamePush: Unity WebGL setup](https://docs.gamepush.com/tutorials/adding-plugin-to-a-unity-project/)
