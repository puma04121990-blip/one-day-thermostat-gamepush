# Интеграция GamePush и выпуск WebGL

## Назначение

Этот документ описывает production-safe подключение Unity-игры «Один день термостата» к GamePush. Платформенная интеграция является **периферийным адаптером**, а не частью авторитетной симуляции: состояние дома, события, политики и сохранения не зависят от callback-порядка SDK. Официальный Unity-плагин GamePush предоставляет модули инициализации, game lifecycle, хранилище, достижения, аналитику и fullscreen; их включение проверяется только после добавления плагина и настроек конкретного проекта.[1] [2]

> **Инвариант:** локальное validated сохранение восстанавливает причинную историю игры даже при отсутствии сети, SDK или аккаунта площадки.

## Предварительные условия

Сначала создайте проект игры в панели GamePush и импортируйте официальный Unity-плагин по актуальной инструкции площадки. В Unity откройте меню настроек плагина и введите Project ID/Public Token, полученные в панели. Эти значения являются локальной конфигурацией и никогда не попадают в Git, issue, screenshot или source code.[2]

| Шаг | Действие | Проверка |
|---:|---|---|
| 1 | Создать игру в GamePush dashboard | У проекта есть собственные идентификаторы и test origin. |
| 2 | Импортировать официальный Unity-плагин | В проекте видны GamePush runtime/editor assets. |
| 3 | Настроить WebGL в окне плагина | Платформенный WebGL template и plugin settings применены. |
| 4 | Вписать локальные Project ID/Public Token | Они не появляются в `git status`. |
| 5 | Добавить scripting define `GAMEPUSH_SDK` | Условная ветка `GamePushPlatformAdapter` активируется. |
| 6 | Собрать test WebGL | Игра проходит bootstrap, даёт GameReady после readiness. |
| 7 | Загрузить test build в GamePush | Проверены lifecycle, storage, achievements и fullscreen. |

## Архитектура адаптера

`GamePushPlatformAdapter` реализует `IGamePlatform`. В обычной разработке compile symbol отсутствует, поэтому `NullGamePlatform` создаёт только in-memory/local режим и даёт пользователю играть без сети. После установки плагина и явного symbol используется GamePush. Такая граница позволяет запускать EditMode tests без SDK и не подменять игровые правила платформенным API.

```text
UnitySimulationDriver / SaveCoordinator
        │ local safe save is authoritative
        ▼
IGamePlatform
   ├─ NullGamePlatform (Editor, no SDK, offline fallback)
   └─ GamePushPlatformAdapter (GAMEPUSH_SDK + WebGL)
          ├─ GP_Init / GP_Game lifecycle
          ├─ GP_Storage compact progress mirror
          ├─ GP_Achievements Archive tags
          ├─ GP_Analytics consent-gated goals
          └─ GP_Fullscreen
```

| Surface | Вызов через официальный плагин | Правило проекта |
|---|---|---|
| Readiness | `GP_Init.OnReady`, затем `GP_Game.GameReady()` | Нельзя запускать simulation дважды или показывать ложную готовность. |
| Gameplay lifecycle | `GP_Game.GameplayStart/GameplayStop`, pause/resume events | Pause не создаёт partial state: save только после завершённого tick. |
| Storage | `GP_Storage.Set/Get` для компактного JSON/manifest | Сначала локальный safe write; cloud only mirrors validated DTO. |
| Achievements | `GP_Achievements.Unlock`/`SetProgress` | Tags отражают Archive и бережность, не score над жителями. |
| Analytics | `GP_Analytics.Goal` | Только с consent; без PII и без несуществующих product KPI. |
| Fullscreen | `GP_Fullscreen.Open` | Вызывается действием игрока/понятным UI, не в panic transition. |

## Хранилище и конфликтная политика

DTO состоит из schema/content version, slot ID, simulation tick, seed, zones/routes/components, active event, policy, residents, Archive и command log cursor. Он намеренно не содержит Unity scene references, шейдерные texture, raw analytics, делегаты и GPU state. `SaveCoordinator` использует протокол `tmp → re-read/validate → current → backup → promote`; локальный backup никогда не удаляется до валидного promotion.

Платформенная синхронизация происходит после checkpoint на границе event/policy/save и только при `Readiness == Ready`. В первом релизе действует предсказуемая стратегия: локальное состояние с валидной schema имеет приоритет для текущей сессии; облачная копия рассматривается как optional mirror. Если API вернуло недоступность/сбой, игра показывает нейтральный статус синхронизации и оставляет queued retry — она не откатывает дом и не лишает игрока прогресса.

## Телеметрия и согласие

Перед первой отправкой gameplay-события интерфейс спрашивает отдельное согласие. Игрок может отказаться или отозвать выбор; это не ограничивает игру. Допустимы только продуктовые сигналы понимания систем: `foreshadow_observed`, `sensor_layer_changed`, `route_previewed`, `route_committed`, `policy_validated`, `policy_blocked`, `component_stage_changed`, `journal_opened`. Нельзя отправлять свободные тексты, персональные идентификаторы, историю личных заметок жильцов или фиктивные результаты плейтеста.

## Достижения первого релиза

Создайте соответствующие tags в GamePush dashboard перед тестом. Unlock вызывается только после того, как canonical Archive уже получил запись локально.

| Tag | Условие | Что не допускается |
|---|---|---|
| `archive_first_flow` | Пройден первый event aftermath | Награда за отключение всего дома. |
| `archive_quiet_route` | Доступна добровольная adaptation после тихого маршрута | Награда за «исправление» Саши/Веры. |
| `archive_recovery_window` | Игрок создал recovery window до Protective stage | Farm start-stop циклов. |
| `archive_clear_policy` | Валидная rule с `UNTIL` и понятной ценой | Скрытая автоматизация без stop condition. |
| `archive_staged_return` | Пройден blackout return без surge | Механическое преимущество для повторных запусков. |

## Release smoke-test

| Проверка | Ожидаемый результат |
|---|---|
| Editor без SDK | `NullGamePlatform`, локальная игра и core smoke-test работают. |
| WebGL загрузка | No missing JS/plugin error; preloader не висит; game ready sent only after init. |
| Pause/resume | Состояние presentation корректно замораживается/продолжается; после паузы создаётся safe checkpoint. |
| Storage offline | Локальный слот сохраняется/загружается, cloud error не прерывает сессию. |
| Storage online | Valid compact DTO mirror сохраняется и читается без потери schema/version. |
| Achievement | Unlock отправляется после local Archive change, duplicate event безопасен. |
| Consent | Без согласия analytics не вызывается; после отзыва новые события не отправляются. |
| Fullscreen | Запускается с ясного действия пользователя, UI остаётся доступным. |
| Low sensory | Все critical cues сохраняют label/pattern/caption и механическую читаемость. |

## Ссылки

[1] [GamePush Unity Plugin — официальный репозиторий](https://github.com/GamePushService/GamePush-Unity-plugin)  
[2] [GamePush: Adding Plugin to a Unity Project](https://docs.gamepush.com/tutorials/adding-plugin-to-a-unity-project/)  
[3] [GamePush: Common Features](https://docs.gamepush.com/docs/get-start/common-features/)  
[4] [GamePush Typed SDK Documentation](https://gamepush.com/sdk/docs/modules.html)
