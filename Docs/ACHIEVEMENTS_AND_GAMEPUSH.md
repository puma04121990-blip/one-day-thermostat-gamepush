# Progression, Achievements и GamePush Lifecycle

## Принцип

Достижения фиксируются **сначала в локальном авторитетном Archive**, а GamePush получает только best-effort idempotent dispatch из отдельной pending queue. Доступность площадки, отказ сети или отсутствие SDK не может отменить локальный unlock, Archive след, save DTO или player-facing экран достижений.

| Состояние | Где хранится | Назначение |
|---|---|---|
| `UnlockedAchievements` | `ArchiveState` и local save | Канонический факт, что игрок открыл достижение. |
| `PendingPlatformAchievements` | `ArchiveState` и local save | Теги, которые ещё требуется передать в GamePush при доступности площадки. |
| `dispatchedAchievementsThisSession` | Runtime `ProgressSyncController` | Защита от многократной отправки одного тега в рамках одной сессии. |

## Data-driven правила

`AchievementCatalog` содержит только ID, localization title/description keys и observable trigger. Правила не используют скрытые персональные данные, не требуют адаптации жильца и не дают игрового преимущества.

| Достижение | Наблюдаемый trigger | Смысл для игрока |
|---|---|---|
| `achievement.threshold_route` | `archive.threshold_route` | Первый читаемый маршрут у порога. |
| `achievement.quiet_route` | `archive.quiet_route` | Маршрут сохранил quiet window. |
| `achievement.day_gathered` | `review.day.stewardship_complete` | День дошёл до восстанавливаемого baseline без открытого service follow-up. |
| `achievement.branch_rebalanced` | `service.outcome.branch_rebalanced` | Материальный след ветви 26 получил обслуживаемое окно восстановления. |

## GamePush lifecycle

`GamePlatformBootstrap` вызывает `GameReady` после platform readiness и `GameplayStart` только после явного действия игрока в onboarding. `GameplayStop` вызывается при завершении активной сессии. `ProgressSyncController` локально сохраняет новый achievement checkpoint и затем пытается отправить pending tags, но только когда `PlatformReadiness.Ready`.

> Текущий подтверждённый интерфейс достижения не предоставляет completion callback. Поэтому pending tag намеренно не удаляется после dispatch: повторная idempotent попытка в следующей сессии безопаснее, чем потеря локального факта из-за непроверяемой удалённой доставки.

Telemetry `achievement_dispatched` проходит consent gate. Сам unlock не зависит от согласия на аналитику, поскольку это продуктовый local progress, а не telemetry.

## Витрина и доступность

Achievement strip показывает локальные открытия сразу. Если есть pending tags, он честно сообщает «Локально сохранено; ждёт GamePush» вместо статуса ошибки. Название достижения берётся из semantic localization key. Journal сопоставляет `archive.achievement.*` с тем же локализованным title, поэтому progression не создаёт технического ID в player-facing тексте.

## Проверки

| Проверка | Ожидаемый результат |
|---|---|
| Trigger появляется дважды | В `UnlockedAchievements` и pending queue остаётся ровно одна запись. |
| Offline fallback | Unlock локально сохраняется; pending tag остаётся до будущей готовности площадки. |
| Ready platform | Тег dispatch-ится не более одного раза за runtime session; локальный unlock не удаляется. |
| Save/load до platform ready | Unlock и pending tag совпадают с состоянием до перезапуска. |
| Low-sensory | Achievement title и platform pending state доступны текстом. |

Core smoke-test покрывает data-driven trigger, uniqueness pending queue, acknowledgement API и save round-trip. Unity/WebGL release pass дополнительно проверяет GamePush readiness, onboarding start/stop, offline fallback и фактическую площадочную конфигурацию achievement ID.
