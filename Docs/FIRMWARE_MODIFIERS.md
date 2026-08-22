# Firmware и Modifiers

## Назначение

Firmware и modifiers меняют **приоритет отображения, видимость или ограниченную форму допустимого маршрута**. Они не дают игроку скрытую информацию, не диагностируют жильцов, не исполняют произвольный код и не отменяют Safety Governor. Все доступные записи находятся в локальном whitelist-каталоге; UI получает только typed preview, а изменение состояния проходит через command queue следующего authoritative tick.

| Канал | Записи в 0.1.x | Что меняется | Ясная цена |
|---|---|---|---|
| Firmware | Surface Memory, Air First, Quiet Window | Ранжирование причин в пределах уже наблюдаемых материальных сигналов | Один другой сигнал получает меньший приоритет или маршрут требует больше времени. |
| Sensor modifier | Ранний контур, Серебряный стиппл | Вес surface/moisture cue до финального ограничения двумя причинами | Появляется больше surface cue либо air cue становится менее заметным. |
| Route modifier | Мягкое открытие, Прямой импульс | `route.direct_lower` получает upper cap или небольшой bounded boost | Медленнее восстанавливается порог либо заметнее резонанс ветви 26. |

## Контракт preview/commit

Нажатие «СМОТРЕТЬ СЛЕДУЮЩУЮ» создаёт `ConfigurationPreviewDTO`. Preview сообщает selection ID, effect, tradeoff, alternative и `StaleAtTick`, но не изменяет `PolicyState`. «ПРИМЕНИТЬ ПРОСМОТРЕННОЕ» доступно только для `Valid` preview и добавляет `SelectFirmware`, `SelectSensorModifier` или `SelectRouteModifier` в очередь. UI отказывается коммитить preview, если world tick стал новее его `StaleAtTick`.

> Preview и commit не являются отдельными расчётами. Preview использует тот же whitelist и те же channel constraints, которыми authoritative command handler проверяет commit.

При commit оркестратор ещё раз проверяет ID/канал. Неизвестная прошивка или modifier не меняет active configuration. Успешная замена добавляет компактную запись в `PolicyState.Log`; сохраняемые IDs уже существуют в save contract, поэтому active firmware/modifiers восстанавливаются без добавления Unity-ссылок в DTO.

## Safety и агентность

Ни firmware, ни modifier не могут создать новый тип команды. В частности, они не могут генерировать `Pulse`, обходить component protective stage, менять согласие жильца или автоматически выбирать personal adaptation. Route modifier применяется только к `SetRoute` на `route.direct_lower`, имеет ограниченную нормализованную величину и остаётся ниже `1.0`. Safety Governor продолжает блокировать unsafe rule независимо от выбранной конфигурации.

## Authoring

`FirmwareDefinitionAsset` и `ModifierDefinitionAsset` отражают runtime definition, включая tuning enum, title/effect/tradeoff keys и safe validation. Они предназначены для Unity authoring, но не выполняют scripts/expression strings. Новый asset допускается только если stable ID уникален, все semantic keys заполнены, effect ограничен описанными channel semantics, а новая запись получила smoke fixture, локализацию и запись в traceability.

## Acceptance pass

| Шаг | Ожидаемый результат |
|---|---|
| Открыть витрину и выбрать «ПРОШИВКА: СМОТРЕТЬ СЛЕДУЮЩУЮ» | Panel показывает effect и tradeoff; active configuration не меняется. |
| Выбрать «ПРИМЕНИТЬ ПРОСМОТРЕННОЕ» до следующего тика | После tick summary и Policy Log показывают новую active запись. |
| Повторить с sensor и route modifier | Sensor меняет только observed-cue ranking; route modifier показывает только bounded effect на direct route. |
| Открыть protective component и preview policy | Governor остаётся высшим приоритетом и выдаёт block/alternative. |
| Save/load после commit | Firmware и оба modifier ID совпадают с состоянием до сохранения. |
| Low-sensory | Effect/tradeoff читаются текстом; selection не зависит только от цвета/анимации. |

В sandbox проверяются whitelist, channel mismatch, preview-without-mutation, next-tick commit, bounded route effect и unknown-ID rejection. Полный Unity/WebGL visual pass остаётся release blocker до открытия проекта в Unity Editor.
