# Decision Log

Этот журнал фиксирует решения, которые нельзя безопасно «понять по коду» через несколько месяцев. Новая запись нужна до изменения игрового контракта, платформенной границы, формата сохранения, доступа к данным игрока или монетизации.

| ID | Решение | Статус | Контекст и последствия |
|---|---|---|---|
| DEC-001 | Unity 6 + URP + C# являются исходной технологической основой. | Принято | Сохраняет канон проекта и даёт WebGL путь GamePush. Desktop остаётся инструментом разработки/профилирования. |
| DEC-002 | Первый release target — WebGL на GamePush; CPU/cutaway visual path является базовым. | Принято | Compute thermal backend не может менять исход пазла и остаётся feature-gated enhancement для совместимых целей. |
| DEC-003 | Симуляция authoritative и чистая: fixed tick → climate → infrastructure/wear → resident rhythm → event → automation/Governor → command queue → snapshot. | Принято | UI, MonoBehaviour, shader и GamePush callback не меняют state напрямую. |
| DEC-004 | Сохранение local-first; облако только синхронизирует validated DTO после safe point. | Принято | Cloud/network failure не ломает сессию и не откатывает validated local state. |
| DEC-005 | GamePush скрыт за `IGamePlatform`; без SDK активен `NullGamePlatform`. | Принято | Потребуется тестировать GamePush branch только с официальным плагином, но EditMode/local flow не зависит от него. |
| DEC-006 | Геймплей не оценивает, не диагностирует и не командует жильцами. | Принято | Наблюдаются только material signatures, contexts и voluntary adaptations. Любой PR с obedience/diagnostic score отклоняется. |
| DEC-007 | Automation обязана иметь `WHEN / IF / THEN / UNTIL / SHOW`; preview и commit используют один evaluator. | Принято | Governor блокирует unsafe route объяснимо, с безопасной альтернативой и Policy Log entry. |
| DEC-008 | Каждый crisis chain требует два независимых foreshadows, минимум два маршрута с явной разной ценой, recovery baseline и low-sensory plan. | Принято | Fairness validator и fixture обязательны для новых сценариев. |
| DEC-009 | Реклама, покупки и соревнование отключены в initial release. | Принято | Возможны только после отдельного ADR, platform review и ethics/accessibility review; power advantage запрещён. |
| DEC-010 | Русский — finished locale, английский — semantic-key scaffold. | Принято | Новый текст сначала получает ключ, затем translation/fallback и text-expansion проверку. |
| DEC-011 | Оригинальные изображения хранятся один раз; runtime-спрайты находятся в `Assets/Resources/Art`. | Принято | Asset manifest фиксирует источник, назначение и WebGL import budget. |
| DEC-012 | Репозиторий приватный и лицензирован как All Rights Reserved до решения владельца. | Принято | В commits не допускаются credentials, user saves, WebGL builds, Library/ или неатрибутированные сторонние медиа. |
