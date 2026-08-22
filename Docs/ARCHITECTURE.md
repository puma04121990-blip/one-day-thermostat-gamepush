# Архитектура

## Принцип авторитетности

Дом существует как чистый `SimulationWorld`. Unity presentation, GamePush SDK, загрузка спрайтов, звук и UI являются потребителями снимка; они не меняют world state непосредственно. Единственные допустимые входы в симуляцию — типизированные `SimulationCommand`, которые добавляются в очередь и обрабатываются в предсказуемом порядке на следующем fixed tick.

```text
Player input / policy candidate / platform lifecycle
                   │
                   ▼
            SimulationCommand queue
                   │
                   ▼
climate → component stress → resident rhythms → events
                   │
                   ▼
       automation evaluator → Safety Governor
                   │
                   ▼
              commit commands → snapshot
                   │                  │
                   ├────── UI/cutaway/audio/accessibility
                   └────── local safe save → optional GamePush mirror
```

| Слой | Ответственность | Не имеет права делать |
|---|---|---|
| `Core` | State, tick, commands, snapshots, DTO, safe save protocol | Unity API, GamePush calls, Shader/UI side effects. |
| `Gameplay` | Climate, routes, wear, events, resident context, automation and diagnostics | Прямые IO/UI writes, скрытая оценка жителя. |
| `Content` | Stable IDs, ScriptableObject authoring, scenario catalog, semantic keys | Исполнять arbitrary C# в conditions. |
| `Presentation` | Cutaway, sensor wash, panels, captions, input, reduced motion | Мутировать `SimulationWorld` без command. |
| `Platform` | GamePush/null adapter, consent, lifecycle, cloud mirror | Становиться единственным авторитетом прогресса. |

## Fixed tick и детерминизм

`SimulationOrchestrator.TickSeconds = 0.2f`. Внутренний tick — `long`; day progress, normalized bands и cost hypotheses не претендуют на реальные инженерные измерения. Внутри одного шага порядок не меняется: сначала меняется материал/воздух, затем стресс компонента, затем контекст ритмов, event phase, bounded automation, command commit и только затем создаётся immutable snapshot.

Детерминизм проверяется одинаковым seed + одинаковым command stream. Нельзя вводить `Time.time`, `Random.value`, enumeration без stable order или platform callback внутрь authoritative systems. Если сценарий требует случайность, она получает seeded deterministic source и пишет его state/cursor в replay/save DTO.

## Сохранения и миграции

`ThermostatSaveRootDTO` хранит только переносимые данные: schema/content version, slot, tick/seed, zones, routes, components, residents, event, policy, Archive и cursor. Save flow: snapshot → `tmp` → reread/deserialization/integrity validation → current в backup → tmp в current. Load пробует current, затем backup и никогда не уничтожает повреждённое evidence автоматом.

Новая schema требует: version bump, явный migrator, old fixture, test round trip и documented fallback. Нельзя добавлять в DTO Unity references, textures, delegates, scene object names или raw analytics. `GamePushPlatformAdapter` получает только уже валидный компактный JSON mirror.

## Policy и Governor

Rules представлены белосписочным типизированным AST (`PolicyCondition`), а не строками или сценарием C#. Правило неполно без `WHEN`, `IF`, `THEN`, `UNTIL`, `SHOW` и tradeoff key. `AutomationEvaluator` используется и Preview, и Commit. `SafetyGovernor` приоритетнее policy/firmware/cosmetics, но не silent: выдаёт `PolicyPreviewDTO` со статусом, причиной, стоп-условием, ценой, affected rhythm marker, stale tick и альтернативой.

## Визуальный backend

Gameplay зависит только от normalized snapshot. WebGL release path — CPU-authoritative cutaway с lightweight image/overlay/pattern/caption language; он не требует compute shader. Enhanced GPU thermal backend допускается только как presentation feature flag и обязан воспроизводить тот же authoritative outcome. Визуальный смысл всегда дублируется: тепло — contours, воздух — arrows/threads, vibration — segmented pair, moisture — drops/stipple, network — nodes, surface — hatch; плюс semantic text/caption.
