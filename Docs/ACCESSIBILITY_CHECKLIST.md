# Accessibility Checklist

## Базовый принцип

Критический игровой сигнал должен быть понятен как минимум по трём каналам: **цвет**, **shape/pattern**, **semantic label/caption**. Звук может обогащать мир, но никогда не является единственным условием считывания риска или маршрута. Low-sensory и reduced motion меняют интенсивность подачи, а не причинность, цену или доступность решения.

| Слой | Цвет | Shape/pattern | Text/caption | Low-sensory fallback |
|---|---|---|---|---|
| Heat | Янтарный | Вложенные контуры | «тепло/холод у…» | Статичный contour + caption. |
| Air | Milky cyan | Направленные нити/стрелки | «воздух входит/обходит…» | Статичная стрелка + caption. |
| Vibration | Copper | Парные сегменты | «ветвь щёлкает…» | Без пульсации, сегменты остаются. |
| Moisture | Silver | Капли/стиппл | «влага остаётся…» | Статичные капли + caption. |
| Network | Cyan/blue | Связанные ячейки | «очередь/возврат…» | Статичная сетка + label. |
| Surface | Amber/cyan | Слоистая штриховка | «стена держит…» | Static hatch + label. |

## Interaction

Проверьте в Unity Editor и в target browser: mouse, touch, Tab/Shift+Tab, Enter/Space, Escape/Back и поддерживаемый controller. Состояние focus должно быть видимо при любой палитре; controls должны иметь minimum touch target; route cost не может быть видимым только в hover tooltip. Политика сначала показывает preview, потом explicit commit; blocked result остаётся в Policy Log и доступен screen reader/caption channel.

## Текст и звук

Русский текст завершён, английский fallback должен не обрезаться при expansion. Не используйте text-as-image для критических инструкций; generated artwork не содержит обязательного смысла. Captions обозначают источник/изменение/направление, а не интерпретируют жителя. Audio slider, captions и low-sensory state сохраняются в settings/DTO по принятой settings policy.

## Manual acceptance run

| Шаг | Ожидаемый результат |
|---:|---|
| 1 | Проиграть пролог с выключенным звуком. Понять два foreshadows и выбрать route. |
| 2 | Включить low-sensory. Пройти с captions/labels/patterns без loss решения. |
| 3 | Включить reduced motion. No flash/continuous pulse; смена state всё ещё читаема. |
| 4 | Увеличить UI/text scale. Panels не перекрывают route cost/Policy Log. |
| 5 | Выключить различение цвета или применить simulator. Patterns/labels различают 6 layers. |
| 6 | Пройти policy valid и blocked. В обоих случаях понятны причина/цена/stop/alternative. |
| 7 | Проверить save/load во время Warning. Captions, sensor selection и policy context корректно восстанавливаются. |

Любой failure блокирует release до исправления или documented accessible альтернативы с таким же геймплейным смыслом.
