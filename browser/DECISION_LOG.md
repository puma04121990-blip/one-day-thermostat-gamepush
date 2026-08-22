# Decision Log — browser-first adaptation

## DL-001 — Phaser 3 + React вместо Unity 6 + URP

**Статус:** принято.  
**Причина:** пользовательский путь должен открываться одной ссылкой без Unity-установки; текущая версия уже использует Phaser 3 + React и проходит Browser CI.

**Адаптация:** Unity-specific `MonoBehaviour`, URP shaders, `ScriptableObject` и `persistentDataPath` заменяются соответственно на plain TypeScript, Phaser presentation, typed data catalogs и versioned localStorage. Fixed-tick authoritative state, command queue, save migration, data ownership и accessibility contracts сохраняются.

**Затронутые области:** `ThermostatSimulation`, typed catalogs, `ContentContract`, React HTML controls, Phaser `ThermostatScene`, tests и documentation.  
**Не меняется:** игрок оптимизирует материальные маршруты дома, а не людей; UI/presentation/platform не могут изменить authoritative outcome.

## DL-002 — Canon выше ранних pitch-формулировок

**Статус:** принято.  
**Причина:** Master Development Bible прямо задаёт приоритет Canon/GDD над pitch и архивными материалами.

**Решение:** в player-facing copy и новых сценариях запрещены диагнозы, поведенческие оценки, скрытые шкалы послушания и обязательное извлечение личных историй. Ранние deck-фразы о «психологическом» объяснении или «спасении человека» адаптируются к наблюдаемому environmental context, добровольной adaptation и материальному маршруту.

## DL-003 — Реальные claims отделяются от vision

**Статус:** принято.  
**Причина:** pitch-пакет содержит целевой PC/console scope, длительности и финалы, которых browser vertical slice пока не реализует.

**Решение:** presentation claim register маркирует каждый тезис как **playable now**, **authored next**, **production target** или **external dependency**. Никакие KPI, сроки, партнёрства, wishlists, конверсии или platform completion не заявляются без факта.

## DL-004 — GamePush не становится источником истины

**Статус:** принято.  
**Причина:** Project ID, allowed origin, official browser bootstrap и achievement IDs не поступили.

**Решение:** любой будущий GamePush SDK только подтверждает/зеркалирует сохранённые локально progression tags. Он не создаёт маршруты, награды, resident outcomes или save authority.
