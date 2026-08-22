# «Один день термостата»

> **Атмосферная системная игра о доме, который читается через тепло, воздух, влагу, износ и ритмы, а не через контроль над людьми.**

«Один день термостата» — однопользовательская narrative systems game для Unity 6/URP. Игрок является старым настенным термостатом Т‑3: он неподвижен, но видит дом в разрезе, переключает сенсорные слои и создаёт бережные маршруты до того, как материальные следы становятся кризисом. Первый выпуск ориентирован на **Unity WebGL и GamePush**; локальный/editor fallback остаётся полноценным, чтобы игра не зависела от доступности сети или SDK.

| Характеристика | Решение |
|---|---|
| Движок | Unity `6000.0.43f1` (Unity 6), URP |
| Целевая поставка | WebGL-сборка для GamePush |
| Авторитетная логика | Чистое C#-ядро с фиксированным тиком `5 Hz` |
| Визуальный backend релиза | WebGL-safe cutaway/atlas; GPU compute — feature-gated enhancement |
| Язык первой версии | Русский, с semantic localization keys |
| Сохранения | Версионный local-first JSON DTO, current/backup, миграционный контракт |
| Платформенный слой | `IGamePlatform`: GamePush при подключённом SDK, `NullGamePlatform` иначе |

## Канон и игровой контракт

Главный принцип проекта прост: **игрок оптимизирует маршруты дома, а не людей**. Жильцы остаются агентами со своими наблюдаемыми ритмами, предпочтениями среды и добровольными адаптациями. В игре нет скрытой шкалы «послушания», диагнозов, механики принуждения или наград за «исправление» человека.

Перед существенным последствием игрок всегда должен иметь возможность ответить на три вопроса: **что меняется**, **почему** (не более двух объяснений) и **что можно сделать и чем заплатить** (минимум два видимых маршрута). Кризис не возникает от непрозрачного броска: он строится из климата, инфраструктуры, двух независимых предвестников, вариантов ответа и нового baseline/recovery после ошибки.

| Слой | Пример |
|---|---|
| L0 — мир | Тёплая поверхность, холод у двери, капли, ритм труб, шаги |
| L1 — сенсор | Heat, Air, Vibration, Moisture, Network, Surface |
| L2 — диагностика | Источник, изменение, максимум две причины, прогноз и два маршрута |
| L3 — память | Journal of Stewardship, Archive, Policy Log, service trace |

## Содержимое текущей основы

Репозиторий содержит рабочую чистую C#-модель пролога: входная дверь Аркадия создаёт холодный фронт; прямой lower-route греет быстрее, но давит на ветвь 26 и тихое окно Саши; middle-route работает медленнее, но снижает резонанс. В ядре уже заложены immutable snapshots, детерминированный event flow, component stress с named explanations/hysteresis, добровольная adaptation, diagnostics, route previews, bounded policies, Safety Governor и версионный save DTO.

| Каталог | Содержимое |
|---|---|
| `Assets/_Project/Core` | Модель дома, fixed-tick orchestrator, snapshots, команды, save DTO и safe-write coordinator |
| `Assets/_Project/Gameplay` | Climate/wear/event/rhythm systems, policy AST, Safety Governor и diagnostics |
| `Assets/_Project/Presentation` | Unity driver, cutaway/UI, local-first accessibility profile и platform pause overlay |
| `Assets/_Project/Platform` | `IGamePlatform`, local fallback и GamePush adapter под compile symbol `GAMEPUSH_SDK` |
| `Assets/_Project/Tests` | Smoke-test детерминизма, Governor и save mapping; Unity tests/fixtures расширяются по мере контента |
| `Docs` | Архитектура, GamePush setup, контентные схемы, traceability, QA и release gates |

## Быстрый старт в Unity

Клонируйте публичный репозиторий, откройте его в указанной версии Unity 6 и позвольте Package Manager восстановить URP/Input System/Test Framework. Сцена и UI-слой собираются из описанных в `Docs/` компонентов; на первом открытии игра использует `NullGamePlatform`, поэтому Project ID и Public Token не требуются для local/editor play mode.

```bash
gh repo clone puma04121990-blip/one-day-thermostat-gamepush
```

В Unity добавьте `UnitySimulationDriver` на bootstrap GameObject. Он запускает canonical prologue и публикует снимки, которые потребляют cutaway/UI/audio. Критически важно не размещать геймплейные правила в `Update` произвольных MonoBehaviour: единственный authoritative order находится в `SimulationOrchestrator`.

## Подключение GamePush

Официальный Unity-плагин GamePush подключается владельцем в Unity через его рекомендованный установочный путь. После импорта плагина задайте **Project ID** и **Public Token** только в локальных настройках, не коммитьте их в Git и включите scripting define symbol `GAMEPUSH_SDK`. Тогда `GamePushPlatformAdapter` начнёт использовать подтверждённые API инициализации, player storage, achievements, analytics, fullscreen и gameplay lifecycle. Без символа проект компилируется и работает через `NullGamePlatform`.

| Функция | Поведение |
|---|---|
| Game ready/lifecycle | Сообщается только после readiness SDK; pause/resume передаются в presentation layer |
| Прогресс | Local safe save является источником восстановления; компактный DTO синхронизируется platform adapter после safe point |
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

Полный checklist, миграции, тесты, content schema и Definition of Done перечислены в [`Docs/`](Docs/). Сценарный маршрут, player-facing цены и ожидаемый новый baseline описаны в [`Docs/VERTICAL_SLICE.md`](Docs/VERTICAL_SLICE.md). Безопасный preview/commit контур firmware и modifiers описан в [`Docs/FIRMWARE_MODIFIERS.md`](Docs/FIRMWARE_MODIFIERS.md). Материальные последствия, service follow-up и end-of-day review описаны в [`Docs/SERVICE_FOLLOW_UP.md`](Docs/SERVICE_FOLLOW_UP.md). Typed локализация, semantic content keys и authoring workflow описаны в [`Docs/LOCALIZATION_AND_CONTENT.md`](Docs/LOCALIZATION_AND_CONTENT.md). Сохраняемые accessibility preferences, keyboard shortcuts, focus contract и pause/resume/restart behaviour описаны в [`Docs/ACCESSIBILITY_PROFILES.md`](Docs/ACCESSIBILITY_PROFILES.md). Data-driven достижения, local-first pending sync и GamePush lifecycle описаны в [`Docs/ACHIEVEMENTS_AND_GAMEPUSH.md`](Docs/ACHIEVEMENTS_AND_GAMEPUSH.md). Правила CI и статус серверной защиты основной ветки описаны в [`Docs/GITHUB_GOVERNANCE.md`](Docs/GITHUB_GOVERNANCE.md). Неподтверждённые метрики, коммерческие ожидания и pitches из исходной документации не трактуются как фактические обещания продукта.

## Лицензирование и секреты

Исходники размещены в публично доступном репозитории, но до отдельного выбора владельцем юридической модели распространения применяется **All Rights Reserved**. Публичная видимость не предоставляет разрешение на повторное использование, распространение или создание производных работ. Не добавляйте в commits GamePush credentials, локальные player saves, WebGL build output, Unity `Library/` или профилировочные captures. Права и происхождение каждого нового визуального/звукового ассета фиксируются в asset manifest.

## Ссылки

[GamePush: Unity-плагин](https://github.com/GamePushService/GamePush-Unity-plugin) · [GamePush: начало работы](https://docs.gamepush.com/docs/get-start/) · [GamePush: Unity WebGL setup](https://docs.gamepush.com/tutorials/adding-plugin-to-a-unity-project/)
