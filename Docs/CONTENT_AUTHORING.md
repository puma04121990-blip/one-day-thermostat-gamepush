# Content Authoring Guide

## Сценарий сначала, текст потом

Новый сценарий начинается не с реплики персонажа и не с эффекта. Сначала заполните material contract: climate profile, infrastructure condition, **boundary context**, два независимых предвестника, два разных корректных маршрута, cooldown, failure baseline, Archive/service outcome и low-sensory plan. `ScenarioDefinition.IsFair()` проверяет минимальную форму canonical runtime content; для Unity authored asset обязательна более строгая `IsAuthorable()`: все boundary/foreshadow/pattern/caption/accessible-summary поля должны быть заполнены. Автор всё равно проверяет смысл: два маршрута должны не просто отличаться числом, а давать разные понятные цены и ритмы.

| Поле | Пример для «Серебряного коридора» |
|---|---|
| Climate | hot/humid residual after active kitchen cycle |
| Infrastructure | drain airflow is slower than moisture leaves the room |
| Foreshadow 1 | Moisture: silver stipple на поверхности + caption |
| Foreshadow 2 | Vibration: extra drain beat + pattern/caption |
| Route A | Quiet drain: разделяет влагу и охлаждение; цена — время |
| Route B | Direct exchange: быстрее меняет воздух; цена — network/noise |
| Failure baseline | Трасса дренажа остаётся видимой, появляется recovery/service follow-up |
| Archive | entry об остаточной влаге и наблюдаемом ритме |

## Boundary card жильца

Каждый житель описывается формой `observable material signature → environmental context → voluntary adaptations → player scope → never control → optional afterglow`. Нельзя писать скрытый психотип, индекс стресса, «правильное поведение», диагностический ярлык или действие, которое Т‑3 может наложить на человека. Personal note допускается только при явном consent, не объясняет физическую причину и не даёт системного преимущества.

## Firmware, modifiers и policies

Firmware меняет только ranking, visibility или timing допустимых options. Один modifier имеет один ясный эффект и одну ясную цену. Rule создаётся как typed condition tree, а не строка/скрипт: `WHEN / IF / THEN / UNTIL / SHOW`. `UNTIL` обязан остановить действие по наблюдаемому состоянию; `SHOW` сообщает игроку cost/marker. Если Governor блокирует rule, контент должен предусмотреть безопасную альтернативу и понятный ключ причины.

## Narrative copy

Новая строка получает semantic key до локализованного текста. Good copy описывает видимый след: «влага остаётся после того, как воздух успокаивается». Bad copy назначает интерпретацию человеку: «Лера снова не справилась». Текст не симулирует инженерную точность там, где система хранит normalized band.

## Перед добавлением authored asset

Добавьте stable ID, semantic keys в `ru.json`/`en.json` и их `Resources` copies, asset provenance при необходимости, scenario fixture, save/migration impact и tests. Создайте `Scripted Day Fixture`, который использует только игрок-доступные route commands и ожидает Archive/outcome в bounded tick window; подключите его в `Content Manifest`, чтобы `IsSafe()` проверил scenario/fixture references. Полный contract и канонический пример находятся в [`SCRIPTED_DAY_FIXTURES.md`](SCRIPTED_DAY_FIXTURES.md). Пройдите `CONTRIBUTING.md` и `ACCESSIBILITY_CHECKLIST.md`; добавьте строку в `TRACEABILITY.md`, если появляется новый тип механики или platform data.
