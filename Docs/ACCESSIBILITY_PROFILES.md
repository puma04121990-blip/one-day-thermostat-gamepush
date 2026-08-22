# Профили доступности и управление

## Назначение

Профиль доступности принадлежит игроку, а не прохождению. Он хранится локально отдельно от slot save в `accessibility_profile_v1.json`, восстанавливается до первого snapshot и применяется ко всем загруженным слотам. Это позволяет сохранить выбранный формат восприятия даже при начале нового дня или восстановлении backup-save.

> **Инвариант.** Профиль не ставит оценок жильцам и не меняет авторитетные правила климата, компонентов, маршрутов, событий или automation. `ReducedMotion` и `LowSensory` могут менять только presentation-safe подачу snapshot: интенсивность декоративного слоя, подписи и ритм интерфейса.

| Поле | Диапазон / значение по умолчанию | Назначение | Authority effect |
|---|---:|---|---|
| `reducedMotion` | `false` | Сокращает необязательное движение и импульсную подачу. | Нет. |
| `lowSensory` | `false` | Ослабляет декоративный sensor wash и оставляет text/caption путь к каждому значимому сигналу. | Нет. |
| `textScale` | `0.85–1.35`, default `1.00` | Масштабирует весь uGUI-текст, включая labels, captions, actions и overlay. | Нет. |
| `keyboardHints` | `true` | Включает shortcut-навигацию и сохранённые подсказки управления. | Нет. |

## Хранение и безопасное восстановление

`AccessibilityProfileStore` использует `Application.persistentDataPath`. При отсутствии, невалидном JSON или ошибке чтения store возвращает serialized fallback из `UnitySimulationDriver`; игра не блокирует запуск и не заменяет local-first save дня. При изменении setting и при `OnApplicationPause`/потере focus сохраняется нормализованная копия профиля. `textScale` нормализуется в `AccessibilityProfileState`, который компилируется и проверяется вне Unity.

Профиль намеренно не добавлен в `ThermostatSaveRootDTO`: slot save описывает воспроизводимое состояние дня, а профиль — предпочтение игрока для любого slot. После `Load()` driver повторно применяет текущий профиль к presentation snapshot, не доверяя историческому presentation состоянию slot-save.

## Управление

Обычная uGUI-навигация должна сохранять видимый focus для mouse, touch, keyboard и controller. `StandaloneInputModule` остаётся безопасным fallback для проекта; фактическая проверка Input System/controller требует Unity device pass.

| Ввод | Действие | Ограничение |
|---|---|---|
| `Tab` / навигация UI | Переход по uGUI focus order, action через Submit. | Проверяется в Unity manual pass. |
| `1`–`6` | Сенсорные слои Heat, Air, Vibration, Moisture, Network, Surface. | Только при включённых keyboard hints и после onboarding. |
| `Q` / `E` | Нижний / средний маршрут у порога. | Ставят обычную команду маршрута на следующий authoritative tick. |
| `R` / `L` | Включить/выключить reduced motion / low-sensory. | Не меняет mechanics или стоимость маршрута. |
| `-` / `=` | Уменьшить / увеличить текст на 5%. | Жёсткий диапазон `85–135%`. |

Подсказки не являются единственным способом действий: все эти функции также доступны в видимых labelled controls. В onboarding shortcut-команды намеренно заблокированы, чтобы не обойти явный player start action и GamePush lifecycle gate.

## Pause, resume и browser restart

`GamePlatformBootstrap` останавливает scaled time при `IGamePlatform.Paused`; поскольку driver накапливает `Time.deltaTime`, fixed tick не продвигается. UI показывает текстовый pause overlay, не выдавая новых simulation command. При `Resumed` platform возобновляет scaled time и скрывает overlay.

При `OnApplicationPause(true)` и потере focus driver сохраняет slot и accessibility profile. На focus return accumulator обнуляется, поэтому приложение не пытается догнать время фоновыми ticks; вместо этого публикуется существующий snapshot. Это гарантирует, что browser/platform overlay не создаёт скрытого ускорения дня.

## Обязательная проверка перед релизом

| Проверка | Evidence | Статус в sandbox |
|---|---|---|
| Profile persistence | Скриншот/лог: `85%`, `135%`, low-sensory, reduced motion и keyboard hints сохраняются после restart. | Требует Unity Editor. |
| No-authority contract | Mono smoke test сравнивает маршрут при включённых и выключенных presentation preferences. | Готово. |
| Keyboard + controller focus | Device matrix: onboarding, route, policy, text scale, service; focus всегда видим. | Требует Unity device pass. |
| Touch controls | Проверить hit targets и отсутствие перекрытия panels на supported portrait/landscape target. | Требует device/browser pass. |
| Pause/resume | GamePush test channel: pause не меняет `Tick`, resume продолжает один snapshot, restart не вызывает catch-up. | Требует GamePush WebGL project. |
| Text expansion | RU и EN при `135%` без обрезания critical labels/captions/overlays. | Требует Unity layout pass. |

Ни один из Unity/WebGL пунктов не следует отмечать как выполненный только по чтению исходников или pure-core тесту.
