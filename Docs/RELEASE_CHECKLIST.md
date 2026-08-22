# Release Checklist — GamePush/WebGL

Этот checklist выполняется на tagged release candidate. Нельзя отмечать пункт по предположению: нужен artifact, screenshot, console log или воспроизводимая команда. Sandbox не содержит Unity Editor и реальный GamePush project ID, поэтому platform-specific строки ниже остаются блокерами до проверки владельцем в его тестовом проекте.

## Исходники и версия

| Проверка | Артефакт/подтверждение | Статус для 0.1.0 |
|---|---|---|
| `main` чист, tag/version/changelog согласованы | `git status`, tag, `CHANGELOG.md` | Готово для RC после tag. |
| Нет credentials/local saves/Library/builds | `.gitignore`, CI secret check | Готово. |
| Unity version зафиксирована | `ProjectSettings/ProjectVersion.txt` | Готово: 6000.0.43f1. |
| Все изображения имеют provenance/import budget | `ASSET_MANIFEST.md` | Готово. |

## Simulation, persistence и контент

| Проверка | Ожидаемый результат | Статус для 0.1.0 |
|---|---|---|
| Core smoke-test | Детерминизм, Governor, DTO round-trip, fairness catalog: PASS | Готово в sandbox. |
| Unity EditMode | Component hysteresis, routes, event cooldown, policy preview/commit, migration fixture | Требует Unity Editor. |
| Unity PlayMode | UI, input, auto-bootstrap, save/load в Foreshadow/Warning/Aftermath | Требует Unity Editor. |
| Corrupt current save | Backup загружается; evidence не уничтожается | Требует Unity Editor/fixture. |
| All scenario definitions | 2 independent foreshadows, 2 visible routes, recovery baseline, low-sensory | Catalog validator: готово; authored SO: перед выпуском. |
| Agency review | Нет command/score/diagnosis для жителя | Требует human narrative review. |

## Доступность и UX

| Проверка | Ожидаемый результат | Статус для 0.1.0 |
|---|---|---|
| Keyboard/mouse/touch/controller navigation | Все route/policy/settings action доступны; focus visible | Требует Unity device pass. |
| Non-colour redundancy | Heat/Air/Vibration/Moisture/Network/Surface имеют shape/pattern/label/caption | Дизайн и asset atlas: готово; runtime pass требуется. |
| Reduced motion | Декоративная пульсация отсутствует, смысл и решения сохранены | UI toggle: готово; Unity pass требуется. |
| Low-sensory | Captions/labels/patterns достаточны для каждого critical cue | UI fallback: готово; scripted playtest требуется. |
| Text expansion | Russian complete, English fallback не обрезается | Требует Unity text-layout review. |

## GamePush/WebGL

| Проверка | Ожидаемый результат | Статус для 0.1.0 |
|---|---|---|
| Official plugin imported | Plugin по официальной инструкции; Project ID/Public Token локальны | Блокер: нужны данные владельца. |
| `GAMEPUSH_SDK` branch | Build компилируется и `GP_Init.OnReady` → `GP_Game.GameReady` происходит один раз | Блокер: GamePush test project. |
| Platform lifecycle | pause/resume не дублирует simulation; GameplayStart/Stop корректны | Блокер: WebGL test. |
| Cloud mirror | Valid compact DTO sync; offline/cloud error сохраняет local session | Блокер: GamePush test. |
| Consent analytics | Без opt-in нет analytics Goal; revoke немедленно останавливает future sends | Блокер: GamePush test. |
| Achievements | Archive tag unlock после local Archive change, duplicate безопасен | Блокер: GamePush dashboard tags. |
| Fullscreen | Запуск только из понятного action; UI remains readable | Блокер: browser test. |
| Ads/payments/leaderboards | В initial release disabled | Код/план: готово; dashboard verify required. |

## WebGL performance

Проверьте browser devtools и Unity profiler на representative GamePush target. На release path не допускаются per-tick allocations/RenderTexture creation. У cutaway artwork установите платформенно подходящий Sprite import profile; загрузите только нужные Resources для текущего экрана; enhanced compute backend не включайте без явной совместимости и deterministic parity check.

## Публикация

Публикация разрешена только после всех блокеров. Тогда создайте signed release tag, оставьте source-only repository, соберите WebGL output вне Git, загрузите его в GamePush test channel, пройдите smoke matrix и только после ручного gate переведите build в публичный канал.
