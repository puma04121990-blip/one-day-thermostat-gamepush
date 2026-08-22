# Contributing

## Рабочая модель

`main` является стабильной веткой. Для любого изменения создайте короткую тематическую ветку, завершите локальные проверки, опишите change в pull request и только затем объединяйте его. Не объединяйте refactor, content balancing, platform credentials и new monetization logic одним изменением: у них разные риски и разные критерии проверки.

Коммиты используют понятную форму `type: summary`, например `feat: add staged blackout return` или `test: cover corrupt save fallback`. В репозитории остаются исходники, `.meta` Unity, authored data и документация; не добавляйте `Library/`, `Temp/`, `Build/`, WebGL output, user saves, profiler captures или идентификаторы/токены GamePush.

## Non-negotiable gameplay contract

| Инвариант | Проверка автора изменения |
|---|---|
| Жильцы остаются агентами | В коде/тексте нет compliance, hidden diagnosis, obedience score или команды человеку. |
| Причинность читаема | Существенный риск имеет climate + infrastructure cause и не более двух player-facing explanations. |
| Справедливость | Новая цепочка даёт два независимых foreshadows, два допустимых пути с различимой ценой, recovery baseline и cooldown. |
| Automation bounded | У rule есть `WHEN / IF / THEN / UNTIL / SHOW`; preview и commit делят evaluator; block объяснён. |
| Persistence | Изменённые данные входят в versioned DTO/migration/fixture и не сохраняют Unity references. |
| Accessibility | Критический сигнал доступен через colour + pattern/shape + label + caption; low-sensory не делает пазл неразрешимым. |
| Платформа | GamePush только через `IGamePlatform`; off-platform fallback остаётся запускаемым. |

## Перед pull request

Сначала выполните чистый C# smoke-test из README. Затем в Unity выполните EditMode и PlayMode tests, запустите сценарий с reduced motion и low-sensory, сделайте save/load в Foreshadow/Warning/Aftermath и убедитесь, что при отключённом GamePush SDK проект использует `NullGamePlatform`.

Если изменение затрагивает GamePush, дополнительно подтвердите, что в commit нет credentials, storage failure не ломает local save, analytics не отправляется без consent, а реклама/покупка/leaderboard не включены случайно. Если изменяется artwork, обновите `ASSET_MANIFEST.md` с назначением, licence/provenance и import budget.

## Определение готовности

Функция считается готовой только когда у неё есть владелец/система, data contract, visible player cost, save/replay plan, test fixture, accessibility fallback и проверка, что она не создаёт dominant/farming route. Ссылки на соответствующие тесты, fixtures и документы добавляются в PR description.
