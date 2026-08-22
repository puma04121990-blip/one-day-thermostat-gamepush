# Сохранения и миграции

## Контракт

`ThermostatSaveRootDTO` — переносимый snapshot дома, а не сериализация Unity-сцены. Root содержит `schemaVersion`, `buildContentVersion`, `slotId`, UTC metadata, simulation tick, scenario seed, integrity marker, arrays zone/route/component/resident, event, policy, Archive и command-log cursor. Все сущности имеют stable IDs; при загрузке runtime-кеши пересобираются из DTO.

| Раздел | Содержит | Не содержит |
|---|---|---|
| House | normalized bands, route openness/availability, component wear/stage/recovery | Transform, GameObject, Renderer, Material, RenderTexture. |
| Event | active chain, phase, seed, foreshadow flags, cooldowns | Coroutine, random global state, audio instance. |
| Policy | firmware/modifier IDs, active rule, enabled flag, log | arbitrary code/string expression/delegate. |
| Residents | observable zone/rhythm/adaptation availability/selection/consent | diagnosis, compliance score, private profile. |
| Archive | entries, unresolved costs, stewardship credits | raw telemetry, user identifiers, platform credentials. |

## Safe write

```
immutable world → DTO → tmp file → deserialize/readback → integrity validation
      → current moved to backup → tmp promoted to current
```

Система никогда не продвигает `tmp`, если mapper не смог собрать валидный world из reread DTO. При загрузке candidates проверяются в порядке `current`, затем `backup`. Невалидный файл не удаляется автоматически: он может понадобиться для export/debug. Если valid candidate отсутствует, создаётся новый slot only after explicit UI confirmation; игра не должна тихо начать другой дом поверх пользовательского слота.

## Версионирование

Изменение `schemaVersion` требует отдельного migrator класса, fixture на предыдущую schema и test, который мигрирует old JSON, валидирует stable IDs и делает `no-commit validation tick`. Изменение content без изменения shape DTO повышает `buildContentVersion`; load не обязан менять schema, но должен сообщить, если referenced content ID удалён/заменён.

> Migration не должна менять завершённое действие игрока задним числом. При отсутствии устаревшего content ID выбирается documented neutral fallback и добавляется Archive/service note, а не silent loss state.

## Cloud mirror

Cloud copy всегда вторична: после local safe write `ProgressSyncController` экспортирует уже validated compact JSON через `IGamePlatform`. Network rejection/deferred readiness оставляет local current/backup полностью работоспособными. Нельзя посылать cloud mirror до сохранения local state, а cloud payload не должен содержать analytics, free-text notes или credentials.

## Обязательные fixtures

Перед публичным выпуском добавьте fixtures для clean round-trip, active policy continuity, every event phase, corrupt current/valid backup, bad integrity, missing content ID fallback, old schema migration и offline GamePush retry. Любая новая DTO-поле добавляется одновременно с fixture и migration policy.
