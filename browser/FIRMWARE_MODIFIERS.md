# Firmware и modifiers в Browser Edition

Configuration в browser edition — это **не власть над домом или жильцами**, а выбор того, какой материальный след будет виден первым и как строго ограничен прямой route. Весь каталог data-driven и whitelist-only: UI не передаёт свободные скрипты, числовые cheat values или неизвестные IDs.

| Канал | Активных элементов | Влияние | Граница |
|---|---:|---|---|
| Firmware | 3 | Приоритет наблюдаемого material trace. | Не заменяет климат, события или agency жильцов. |
| Sensor modifier | 2 | Паттерн и раннее появление сенсорного следа. | Не меняет route outcome напрямую. |
| Route modifier | 2 | Только bounded effect прямого маршрута. | Не создаёт новый маршрут и не обходит visible cost. |

## Preview и commit

При выборе карточки браузер строит typed preview с title, effect, trade-off и `staleAtTick`. Preview не меняет `GameState`. Только `valid` preview может быть поставлен в очередь; на следующем fixed tick simulation повторно проверяет whitelist, channel и tick, затем добавляет компактную запись в Archive и local save. Unknown IDs и stale previews silently block without mutation.

`modifier.soft_open` ограничивает резонанс прямого импульса ценой более медленного восстановления порога. `modifier.direct_boost` усиливает тот же прямой маршрут, но добавляет ограниченный видимый резонанс ветви. Ни одна настройка не создаёт hard game-over.
