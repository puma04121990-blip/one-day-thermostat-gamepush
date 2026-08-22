# Master traceability matrix

> Источник истины: [`docs/source/ONE_DAY_THERMOSTAT_COMPLETE_PROJECT_DOCUMENTATION.md`](docs/source/ONE_DAY_THERMOSTAT_COMPLETE_PROJECT_DOCUMENTATION.md). Статусы описывают текущую browser edition, а не обещание PC/console production scope.

| Приложения | Авторитетный материал | Browser статус | Действие в этом проекте |
|---|---|---|---|
| 01–02 | Master Bible и source manifest | **Адаптирован** | Canon, ownership, DoD, conflict rules и исходники сохранены в `docs/source`; browser adaptation зафиксирована в Decision Log. |
| 03–08 | Концепт, механики, GDD, климат, арки, Олег | **Частично реализован** | Есть fixed-tick авторские сценарии «Порог Аркадия», «Кухня без огня», «Тихий цикл», sensor DTO и typed boundary cards; climate profiles, Oleg/blackout и широкий event director остаются следующей tranche. |
| 09–14 | UI/UX, диагностика, personality, sound | **Частично реализован** | Есть cutaway, labels/patterns, low-sensory/reduced motion, семь selectable semantic sensor layers и text-first diagnostic panel; adaptive audio/personality register остаются production work. |
| 15–17 | Первые 5/10 минут и heat tutorial | **Частично реализован** | Текущий onboarding учит двум маршрутам; добавить progressive tutorial beats и policy/Governor explanation. |
| 18–28 | Events, crises, emergency, climate studies | **Не реализован как отдельная система** | Добавить deterministic Event Director, foreshadow contract, cooldown, reserve/blackout и authored browser-safe scenarios. |
| 29–36 | Stewardship, tuning, endgame, achievements, Charter | **Частично реализован** | Service credits, local achievements, policy templates и bounded Governor log существуют; Charter, replay selection, climate studies и full endings остаются production work. |
| 37–41 | Unity shaders, TDD, technical decks | **Browser-adapted / внешний reference** | Fixed tick и pure TypeScript сохраняют авторитетность; Unity-only render and storage specifics не переносятся в Phaser runtime. |
| 42–48 | Vertical slice, budget, playtest, feedback, localization | **Частично реализован** | Сценарный slice и local save есть; добавить consent-first local feedback export, semantic strings и reproducible scenario fixtures. |
| 49–54 | Steam, market, research notes | **Документация / future production** | Подготовить evidence-based positioning и localization plan; не объявлять внешние результаты без данных. |
| 55–59 | Pitch deck content | **Source preserved; deliverable pending** | Извлечённые тезисы сведены в claims register; итоговый deck формируется после проверки playable state. |
| 60–68 | Q&A и presentation scripts | **Source preserved; deliverable pending** | Используются как scripts/appendix для publisher, technical и investor presentations; Canon имеет приоритет над ранними формулировками. |

## Границы реализации

| Класс требования | Правило исполнения |
|---|---|
| Авторитетная игровая логика | Только typed plain TypeScript в `client/src/game`; UI и Phaser получают snapshots. |
| Контент и события | Stable IDs, versioned save migration, два независимых foreshadows, два честных routes, visible price, no hard fail. |
| Жители | Только material signature → context → voluntary adaptation → player scope → never-control. |
| Визуал/звук | Семантические labels, shape/pattern/caption fallback, low-sensory и reduced-motion path. |
| Unity-only материал | Reference для architecture, но не требование к browser игроку. |
| Pitch/market материал | Отделяется на verified facts, authored scope и production target. |

## Следующая implementation tranche

1. Ввести typed sensor/diagnostic/event/boundary/policy contracts в authoritative state.
2. Портировать browser-safe tutorial + два кризиса: «Кухня без огня» и «Тихий цикл».
3. Добавить Governor path, reserve-aware staged return и Archive outcomes без resident scoring.
4. Добавить tests, source-to-feature trace notes и evidence-based publisher deck.
