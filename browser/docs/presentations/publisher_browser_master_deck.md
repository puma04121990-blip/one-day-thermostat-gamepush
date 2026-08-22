# «Один день термостата» — browser-first publisher deck

## Slide 1 — Один день термостата

**Narrative system puzzle about care that cannot be seen.**

Browser-first playable vertical slice. Игрок — старый настенный термостат, который читает дом через материальные следы, а не наблюдает и не управляет жильцами.

Visual direction: dark blueprint cutaway, amber route geometry, route-mark asset as a small corner mark.

## Slide 2 — Обещание игроку

**Вы не управляете температурой. Вы выясняете, что тепло означает для этого дома сейчас.**

Физика даёт несовершенные сигналы. История возникает из контекста этих сигналов. Забота выражается через среду, восстановимое время и честную цену маршрута, а не через оценку или контроль человека.

Evidence label: **Canon + playable onboarding.**

## Slide 3 — Один диагностический ритм

**Аномалия → два независимых предвестника → маршрут с ценой → отложенное наблюдение.**

В browser build игрок видит две material foreshadows до того, как становятся доступны два маршрута. Любой route продолжает день; прямой путь может открыть видимую service-задачу вместо hard fail.

Evidence label: **Playable now.**

## Slide 4 — Семь слоёв тепловой эхолокации

Heat, air, vibration, moisture, network, surface и memory — это не «режим детектива», а семь отдельных вопросов к одному дому.

Каждый слой имеет pattern, текстовый source/change/causes/forecast и ограничение собственной достоверности. Browser UI дублирует смысл текстом и геометрией, чтобы критические сигналы не зависели от цвета.

Evidence label: **Playable now; readable demo abstraction, not a physical simulator.**

## Slide 5 — Три authored browser scenarios

| Сцена | Материальная проблема | Смысл границы |
|---|---|---|
| Порог Аркадия | Внешний фронт и ветвь 26 | Входной ритм — не неисправность комнаты. |
| Кухня без огня | Влага, дренаж и неровная сеть | Локальное тепло не даёт готовой причины. |
| Тихий цикл | Западная поверхность и ночная ветвь | Скорость возврата не всегда равна бережности. |

Каждая сцена содержит boundary card: material signature, context, voluntary adaptation, player scope и явный запрет на диагноз/принуждение.

Evidence label: **Playable now.**

## Slide 6 — Минимальные verbs, видимые последствия

Игрок выбирает бережный или прямой материальный маршрут. Configuration preview показывает benefit и price до commit, а действие входит в authoritative state только на следующем 200 ms fixed tick.

Direct route повышает видимые material metrics и может открыть bounded recovery. Careful route создаёт временной буфер; оба пути оставляют Archive-record и новый baseline.

Evidence label: **Playable now.**

## Slide 7 — Safe automation вместо чёрного ящика

Policy rules используют читаемую форму **WHEN → IF → THEN → UNTIL + цена**. Governor принимает только rule текущего authored context, записывает его в следующем тике и завершает по видимой stop condition.

Это automation для материального порядка маршрута; она не прогнозирует и не регулирует людей.

Evidence label: **Playable now.**

## Slide 8 — Local-first technical proof

React HTML controls создают constrained intents; pure TypeScript `ThermostatSimulation` владеет 5 Hz fixed-tick state; Phaser Canvas только визуализирует snapshot. Сохранения мигрируют по `schemaVersion`/`contentVersion`; unknown authored IDs получают safe fallback, future schema отклоняется.

Initial browser shell lazy-loads Phaser only after explicit start. Current build keeps the initial shell separate from the deferred Phaser engine; heavy cutaway is a 141 KB WebP loaded after start.

Evidence label: **Playable now; GamePush client remains intentionally inactive without supplied test-project data.**

## Slide 9 — Production horizon, stated honestly

Следующая авторская tranche: blackout/reserve scenario, Oleg/Nina content, regional climate profiles, policy/Charter expansion, adaptive audio and consent-first playtest workflow.

Full PC/console production, long-form endings, market metrics и external platform activation — **production targets**, not claims of the current browser demo.

Visual direction: three-stage path from current playable slice to validated production scope; do not show unverified KPI.

## Slide 10 — Почему этот scope управляем

**Один дом, одна связанная система, один чёткий ethical contract.**

Browser vertical slice уже демонстрирует core promise: несовершенные сигналы, материальные маршруты, visible cost, recoverable outcomes и локальная воспроизводимость. Master package, traceability matrix и claim register остаются в репозитории, чтобы следующий production этап не терял Canon.

Footer: repository and browser preview link supplied by project environment.

## References

1. `docs/source/ONE_DAY_THERMOSTAT_COMPLETE_PROJECT_DOCUMENTATION.md` — Master Development Bible and source manifest.
2. `docs/source/«Один_день_термостата»_расширение_механики_и_сюжетной_арки.pdf` — gameplay and narrative expansion.
3. `docs/source/Один_день_термостата.pdf` and `docs/source/thermostat_publisher_pitch_content.md.pdf` — supplied publisher pitch materials.
4. `MASTER_TRACEABILITY.md` and `PRESENTATION_CLAIMS_REGISTER.md` — browser adaptation and evidence boundaries.
