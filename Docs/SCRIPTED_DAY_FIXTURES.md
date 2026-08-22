# Authorable scenarios и scripted day fixtures

## Граница ответственности

`ScenarioDefinitionAsset` является Unity authoring-обёрткой для сценарного контента. Он материализуется в чистый `ScenarioDefinition`, где `IsAuthorable()` проверяет material contract. Обязательны stable ID, climate/infrastructure/boundary context, low-sensory plan, два независимых предвестника, два видимых маршрута с accessible summary, baseline и Archive outcome. Каждый route в authoring contract по умолчанию помечается как сохраняющий agency жильцов.

> **Fixture не является игровым режиссёром.** `EventDirector` остаётся единственным authority для смены фаз, создаваемых последствий и переходов кампании. `ScriptedDayFixture` только задаёт воспроизводимый player-facing маршрут: какую штатную route command игрок выбирает после видимого Warning, какой Archive/outcome ожидается и за какое ограниченное число fixed ticks это должно стать наблюдаемым.

| Слой | Ответственность | Не может делать |
|---|---|---|
| `ScenarioDefinitionAsset` | Authoring данных и semantic references. | Вносить команды, скрипты или мутацию simulation. |
| `ContentManifestAsset` | Проверяет уникальные ID, authoring safety, fixture references и локализацию. | Создавать fallback-механику или обходить fairness. |
| `ScriptedDayFixtureAsset` | Хранит authorable walkthrough-шаги для Unity fixture. | Менять EventDirector, жителей или текущий slot save. |
| `ScriptedDayFixtureCatalog` | Предоставляет pure-C# canonical fixture для CI. | Управлять live session. |
| `EventDirector` | Обрабатывает fixed-tick переходы, costs, Archive и recoverable cooldown. | Доверять authoring asset как executable behavior. |

## Канонический fixture

`fixture.careful_three_chain_day` закрепляет бережный маршрут vertical slice. Он начинается с видимых предвестников, использует обычную команду маршрута, ждёт штатного Aftermath и только затем переходит к следующей цепочке. Так CI проверяет не «идеальный» скрытый state write, а тот же игровой путь, который доступен игроку.

| Цепочка | Команда fixture | Ожидаемый след | Ограничение |
|---|---|---|---|
| `prologue.open_door` | `route.quiet_middle = 0.56` | `archive.threshold_route` | Warning и Aftermath должны появиться в bounded tick window. |
| `event.silver_corridor` | `route.drain_quiet = 0.56` | `archive.silver_corridor` | Не открывает direct route и сохраняет различимую цену времени. |
| `event.blackout_return` | `route.quiet_middle = 0.56` | `archive.staged_return` | Заканчивается `baseline.day_complete`, а не hard failure. |

Fixture validation отвергает неизвестный scenario/route ID, route без `PreservesResidentAgency`, повторяющийся scenario, пустой expected outcome, выходящую за `0–1` openness или отсутствующие tick bounds. Это предотвращает превращение authoring data в непрозрачный «автопроход».

## Unity authoring workflow

В Unity создайте `Scenario Definition` и заполните поля material contract до подключения в `Content Manifest`. Добавьте semantic keys в `ru.json` и `en.json`, синхронизируйте copies в `Resources/Localization`, затем добавьте `Scripted Day Fixture` с теми же stable scenario/route IDs. Manifest должен успешно пройти `IsSafe()`; отсутствие boundary context, caption, pattern, accessible summary или локализации является ошибкой authoring, а не дефолтом.

Для новой или изменённой цепочки создайте отдельный fixture. Затем пройдите PlayMode evidence: дождитесь Warning естественным путём, выполните только игрок-доступные controls, проверьте Archive/outcome, save/load в середине цепочки и доступность low-sensory/caption path. Sandbox проверяет pure-C# contract, но не заменяет Unity asset serialization, inspector authoring, layout и WebGL/GamePush test channel.

## Проверяемый contract

`CoreSmokeTests` выполняет canonical fixture против `SimulationWorld` и `SimulationOrchestrator`. Он проверяет valid authorable scenario, rejection неполного boundary contract, bounded Warning/Aftermath, ожидаемые Archive entries и переход к recoverable cooldown. CI компилирует fixture registry вместе с ядром, поэтому смена route ID, Archive key или timing не может тихо рассинхронизировать walkthrough и authority.
