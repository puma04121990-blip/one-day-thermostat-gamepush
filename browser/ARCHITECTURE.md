# Архитектура Phaser edition

```text
React controls ──route intent──> ThermostatSimulation ──snapshot──> React overlay
                                      │
                                      ├── fixed tick 200 ms
                                      ├── localStorage day save
                                      └── GamePush mirror later
                                      │
                                      └── snapshot ──> Phaser ThermostatScene
```

`ThermostatSimulation` не импортирует Phaser или React. Phaser визуализирует snapshot, а HTML controls создают только constrained `careful`/`direct` route intents. Поэтому renderer, animation, UI и будущий platform SDK не могут тайно изменить ход дня.

Каждый tick длится `200 ms`; входящий browser frame delta capped at `250 ms`. Обычный fixed step не теряется, а после скрытия вкладки всё ещё не происходит крупного catch-up шага. Preferences изменяют лишь presentation и хранятся отдельно от состояния дня.

## Сохранения

| Key | Содержимое | Поведение при ошибке |
|---|---|---|
| `one-day-thermostat.phaser.save.v1` | tick, chain, Archive, unresolved material traces и metrics. | Невалидный JSON заменяется новым днём. |
| `one-day-thermostat.phaser.profile.v1` | low-sensory, reduced-motion, text scale. | Возвращаются безопасные defaults. |

Browser storage является local-first. Дальнейший cloud mirror обязан быть idempotent и не может отменить уже видимый локальный outcome.
