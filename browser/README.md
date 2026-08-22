# Один день термостата — Browser Edition

Это **лёгкая браузерная версия** игры на Phaser 3 и React. Для запуска игроку не нужен Unity, Git, WebGL build или локальный GamePush plugin: опубликованная версия открывается обычной ссылкой в браузере.

## Быстрый запуск для разработки

```bash
pnpm install
pnpm dev
```

Откройте URL, который покажет Vite. Для production-проверки используйте:

```bash
pnpm check
pnpm build
```

## Что уже играет

Игрок начинает наблюдение, получает два видимых предвестника, выбирает один из двух маршрутов, читает последствия в Archive и проходит три authored цепочки: «Порог Аркадия», «Кухня без огня» и «Тихий цикл». Даже прямой маршрут продолжает день через material service trace: в игре нет hard game-over, obedience score или управления жильцами.

Клавиша `S` и подпись наблюдения открывают семь semantic sensor layers: тепло, воздух, вибрация, влага, сеть, поверхность и память. Каждый слой показывает source, change, две возможные материальные причины, forecast и ограничение сигнала. В Archive видна отдельная boundary card: материальный signature, контекст, возможная voluntary adaptation, player scope и прямой запрет на диагнозы/принуждение.

В configuration sheet (`C`) доступны три firmware, два sensor modifier и два route modifier. Карточка сперва показывает effect и price; затем выбранный typed preview становится в очередь и только на следующем fixed tick попадает в local-first state. См. [`FIRMWARE_MODIFIERS.md`](FIRMWARE_MODIFIERS.md).

В нижней части той же панели находятся bounded policy rules. Они используют видимую форму `WHEN → IF → THEN → UNTIL + цена`; Governor разрешает только текущий authored context, ставит commit в next tick, сохраняет start/stop record в Archive и никогда не управляет жильцами.

В service sheet (`V`) прямой маршрут может открыть материальную задачу обслуживания. Она касается только компонента дома, применяется bounded recovery на следующем fixed tick и не превращает день в hard fail. См. [`SERVICE_FOLLOW_UP.md`](SERVICE_FOLLOW_UP.md).

Локальные achievements появляются только от fixed-tick Archive/review/service фактов, не дают power и сохраняют pending platform mirror tags до подключения настоящего GamePush browser SDK. Полный контракт: [`ACHIEVEMENTS.md`](ACHIEVEMENTS.md). Клавиша `A` открывает их в Archive.

Browser shell теперь отделён от Phaser engine: canvas runtime загружается только после явного старта наблюдения. Local saves имеют `schemaVersion`/`contentVersion` fallback, а GamePush boundary остаётся disabled до test project. Детали и измеренный bundle baseline: [`PERFORMANCE_AND_CONTENT_COMPATIBILITY.md`](PERFORMANCE_AND_CONTENT_COMPATIBILITY.md); условия platform activation: [`GAMEPUSH_BROWSER_ADAPTER.md`](GAMEPUSH_BROWSER_ADAPTER.md).

Полный пользовательский master-пакет и все полученные PDF-preservation copies находятся в [`docs/source`](docs/source). Реальная адаптация, decisions и границы заявлений зафиксированы в [`MASTER_TRACEABILITY.md`](MASTER_TRACEABILITY.md), [`DECISION_LOG.md`](DECISION_LOG.md) и [`PRESENTATION_CLAIMS_REGISTER.md`](PRESENTATION_CLAIMS_REGISTER.md).

| Слой | Технология | Ответственность |
|---|---|---|
| Browser shell | React + TypeScript | HTML controls, onboarding, Journal, keyboard accessibility, preferences. |
| Visual field | Phaser 3 | Cutaway-дом, route line, material sensor geometry и fixed-loop rendering. |
| Authority | `ThermostatSimulation` | 5 Hz fixed tick, цепочки, route consequences, Archive и local save. |
| Persistence | `localStorage` | День и профиль игрока остаются на том же устройстве/в том же браузере. |

## Управление

| Клавиша | Действие |
|---|---|
| `Q` | Бережный маршрут, когда он доступен. |
| `E` | Прямой маршрут, когда он доступен. |
| `V` | Открыть сервис и обзор дня. |
| `S` | Открыть sensor layers и diagnostic copy. |
| `L` | Low-sensory режим. |
| `M` | Reduced motion. |
| `Esc` | Закрыть текущую панель. |

Все действия также доступны кнопками; клавиши не являются единственным путём прохождения.

## GamePush

Browser Edition сознательно запускается **без GamePush credentials**. Local-first день и accessibility profile уже работают без сети. Реальная интеграция GamePush добавляется после предоставления test project и официального browser SDK: platform bridge сможет зеркалировать уже сохранённые локально progression/achievements, не становясь источником authoritative состояния.

## Не делать

Не вставляйте GamePush токены в `.env`, исходники или Git commits. Не храните `node_modules`, Vite `dist` и browser localStorage exports в репозитории.
