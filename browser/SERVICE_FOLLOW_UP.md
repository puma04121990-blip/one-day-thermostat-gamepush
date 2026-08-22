# Service follow-up и обзор дня в Browser Edition

Service follow-up превращает цену прямого маршрута в **одну видимую, материальную и восстанавливаемую задачу**. Задача всегда ссылается на компонент дома, наблюдаемый след, одно bounded действие и Archive outcome; она не описывает жильца и не создаёт оценку игрока.

| Видимый trace | Component | Действие | Bounded outcome |
|---|---|---|---|
| Резонанс ветви 26 | `component.branch_26` | Сбалансировать ветвь | Снижение branch metric и resolved service entry. |
| Очередь кухонного контура | `component.kitchen_drain` | Очистить окно дренажа | Снижение moisture metric и resolved service entry. |
| Второй peak сети | `component.network_main` | Вернуть сеть по этапам | Снижение air metric и resolved service entry. |

## Contract

Direct route добавляет только known reason ID. Во время следующего fixed tick simulation materializes не более одной задачи на whitelist template. Нажатие «ОБСЛУЖИТЬ» ставит task ID в очередь; следующий tick заново ищет открытый task, применяет bounded recovery и делает его resolved. Повторный, неизвестный или уже resolved ID ничего не меняет.

После третьей цепочки создаётся end-of-day review. Когда задач нет, review сообщает о собранном recovery. Когда задачи открыты, review сохраняет их видимыми, но **не является hard fail**: игрок может обслужить их после обзора. `localStorage` сохраняет task IDs, component scope, resolution, credits и review state.
