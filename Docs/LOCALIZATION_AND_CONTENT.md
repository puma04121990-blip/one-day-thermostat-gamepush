# Локализация и Content Authoring

## Назначение

Игровой контент использует **semantic keys**, а не строки, спрятанные в simulation или в представлении. Русская таблица `ru-RU` — текущая primary locale; `en-US` — fallback. Обе canonical таблицы находятся в `Assets/_Project/Content/Localization/`, а точные копии в `Assets/Resources/Localization/` загружаются Unity runtime локально, без сети и без зависимости от платформы.

| Слой | Ответственность | Запрещено |
|---|---|---|
| `LocalizationCatalog` | Typed lookup, fallback, marker отсутствующего ключа, duplicate validation | Тихо удалять текст или подменять semantic key пустой строкой |
| `LocalizationProvider` | Загрузить `TextAsset` primary/fallback и передать UI готовый текст | Загружать удалённые таблицы или platform credentials |
| `ContentManifestAsset` | Проверить unique scenario/fixture/configuration IDs, strict scenario/fixture safety и все referenced player-facing keys | Исполнять expressions, scripts или произвольные команды из content asset |
| `Tools/validate-localization.js` | Проверить JSON schema, ru/en parity и Resources sync | Публиковать divergent runtime copy |

## Формат таблицы

Каждый документ содержит locale и массив `entries`; каждая запись обязана иметь единственный dotted semantic key и непустой текст.

```json
{
  "locale": "ru-RU",
  "entries": [
    { "key": "firmware.surface_memory.title", "value": "Память поверхности" },
    { "key": "cost.branch_26_resonance", "value": "ветви 26 понадобится окно восстановления" }
  ]
}
```

Если key отсутствует в primary locale, catalog ищет его в `en-US`. Если key отсутствует и там, UI получает видимый marker `[[key]]`. Это намеренно: missing localization не превращается в немой игровой сигнал.

## Authoring-поток

Новая firmware/modifier/сценарная запись получает stable ID, semantic title/effect/tradeoff keys, доступный summary и deterministic fixture. Для сценария `IsAuthorable()` требует boundary context, complete captions/patterns/conditions, два независимых sensory families и agency-preserving routes. Fixture хранит только player-доступные route commands и ожидаемые Archive/outcome keys. Затем assets добавляются в `ContentManifestAsset`; manifest проверяет uniqueness ID, безопасные configuration/scenario/fixture definitions и существование всех referenced key в runtime catalog.

> Content изменяет только данные. Он не может создать новую команду, дать дополнительные полномочия T‑3, диагностировать жильца или обойти Safety Governor.

| Изменение | Обязательная проверка |
|---|---|
| Новый semantic key | Добавить одновременно в `ru.json` и `en.json`; обновить Resources копии; запустить `node Tools/validate-localization.js`. |
| Новый firmware/modifier | Safe fields, unique stable ID, title/effect/tradeoff keys, whitelist/preview fixture. |
| Новый сценарий | `IsAuthorable()`: два независимых предвестника, boundary/low-sensory/cost keys, accessible summaries, agency routes и отдельный fixture. |
| Новый scripted fixture | Связать только с существующими scenario/route IDs; добавить localized Archive/outcome keys; bounded Warning/Aftermath PlayMode evidence. |
| Новый Archive/service outcome | Материальная причина, component-only follow-up при необходимости, text fallback и save fixture. |

## CI и release gate

`Core checks` запускает localization contract до required-documents gate. Он блокирует duplicate keys, пустые values, расхождение ru/en наборов и несинхронные Resources. Deterministic core smoke-test отдельно подтверждает fallback и visible marker missing key. Полная локализационная visual-проверка в Unity Editor/WebGL остаётся release gate: сменить `preferredLocale` в `LocalizationProvider`, пройти onboarding, firmware/modifiers, service follow-up и end-of-day review; убедиться, что текст не обрезан и low-sensory сохраняет все смыслы.
