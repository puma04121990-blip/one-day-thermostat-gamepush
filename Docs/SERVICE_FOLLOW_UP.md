# Service Follow-up и Archive Review

## Назначение

Service follow-up превращает наблюдаемую цену маршрута в **материальную, восстанавливаемую задачу**, а не в наказание или скрытую оценку. Он никогда не касается жильца: задача ссылается на компонент, видимый след, одно безопасное действие обслуживания и один Archive outcome. Игрок может закончить день с открытой задачей; это создаёт review, но не hard fail.

| Видимый след | Service follow-up | Компонент | Действие | Archive outcome |
|---|---|---|---|---|
| Резонанс ветви 26 | `service.branch_26.resonance` | `component.branch_26` | Сбалансировать ветвь | `service.outcome.branch_rebalanced` |
| Очередь кухонного контура | `service.kitchen_drain.queue` | `component.kitchen_drain` | Очистить окно дренажа | `service.outcome.drain_window_cleared` |
| Второй network peak | `service.network_main.peak` | `component.network_main` | Вернуть сеть по этапам | `service.outcome.network_return_staged` |

## Авторитетный цикл

`ServiceFollowUpSystem` запускается в canonical fixed-tick порядке после event director. Он сопоставляет только известные `UnresolvedCosts` с whitelist templates; один и тот же cost создаёт не более одной задачи. При появлении follow-up добавляется `archive.service_follow_up`, поэтому Journal показывает, что последствие стало обслуживаемым.

Команда `CompleteServiceFollowUp` проходит через ту же queue, что и route/policy actions. Она ищет только открытый follow-up по ID и применяет bounded recovery к его component: немного снижает wear/recent stress, повышает recovery progress, помечает задачу resolved и добавляет outcome. Неправильный или повторный ID ничего не меняет. Safety Governor и component stage не обходятся; действие не создаёт произвольную автоматику.

## End-of-day review

При переходе кампании в `Cooldown` создаётся `archive.end_of_day_review`. Если открытых service follow-up нет, review key — `review.day.stewardship_complete`; если есть — `review.day.service_follow_up_open`. Это описание состояния дома, а не рейтинг игрока. Открытые задачи остаются видимыми и могут быть обслужены после review.

## Сохранения

`ArchiveSaveDTO` переносит follow-ups, resolved state, review availability и review key. Новые поля имеют safe defaults, поэтому старый slot без этих данных загружается с пустым service list. Сервисные DTO не содержат `GameObject`, Unity reference, персональные данные или platform credential.

## Витрина и доступность

Правый panel показывает открытый follow-up как «СЕРВИС И ОБЗОР ДНЯ»: видимый след, действие и button с названием компонента. Когда открытых задач нет, тот же panel показывает end-of-day review. Смысл передаётся текстом, поэтому обслуживание доступно в low-sensory/reduced-motion режиме и не зависит от цвета/анимации.

## Acceptance pass

| Шаг | Ожидаемый результат |
|---|---|
| Пройти быстрый маршрут пролога | После aftermath появляется service follow-up для ветви 26; Journal содержит сервисный след. |
| Выбрать «ОБСЛУЖИТЬ» | После следующего tick task становится resolved, component получает bounded recovery, появляется Archive outcome. |
| Нажать action повторно | Нет новой recovery/credit/duplicate Archive entry. |
| Завершить день без follow-up | Panel показывает stewardship review, не hard fail. |
| Завершить день с открытой задачей | Panel показывает open service review; progression остаётся доступной. |
| Save/load в обоих состояниях | Follow-up ID, component, resolved status и review key совпадают с состоянием до сохранения. |

В sandbox проверяются materialization, component-only scope, explicit resolution, bounded recovery, Archive outcome, review key и save round-trip. Unity/WebGL visual pass остаётся обязательным release gate.
