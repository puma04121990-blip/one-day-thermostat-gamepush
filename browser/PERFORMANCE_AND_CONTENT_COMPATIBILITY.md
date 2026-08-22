# Performance и content compatibility

## Bundle boundary

Baseline production bundle был одним `index` chunk: **1.96 MB / 475 KB gzip**. После split initial shell состоит из `index` **166.98 KB / 33.84 KB gzip**, `react-core` **390.77 KB / 116.57 KB gzip** и CSS **104.25 KB / 19.65 KB gzip**. Phaser engine вынесен в отдельный `phaser-engine` chunk **1.48 MB / 339.86 KB gzip** и начинает загружаться только после явного «НАЧАТЬ НАБЛЮДЕНИЕ». Рост initial shell отражает local-first Event Director/tutorial/feedback, reserve HUD и replay copy; deferred-engine boundary сохранена.

> Границы измерены командой `pnpm build` в текущем проекте. Размеры зависят от версии dependency и не являются обещанием сетевой скорости на устройстве игрока.

## Delayed engine status and mobile asset path

После нажатия «НАЧАТЬ НАБЛЮДЕНИЕ» HTML shell показывает доступную status panel. Она последовательно сообщает о загрузке split-модуля (**36%**) и boot Canvas runtime (**72%**); это **lifecycle progress**, а не вымышленный байтовый процент сети. Ready-состояние наступает лишь после завершения `ThermostatScene.create()`, то есть после создания cutaway, canvas-слоёв и первого snapshot draw.

React callbacks boot/ready memoized. Поэтому регулярные 5 Hz snapshot updates не меняют dependencies Phaser effect и не уничтожают/создают игру повторно. Этот lifecycle также сохраняет явный Canvas renderer fallback для сред, где WebGL framebuffer недоступен.

Hero cutaway, загружаемый только вместе со сценой, заменён с исходного **2560×1440 PNG, 5.9 MB** на полный 16:9 **1600×900 WebP, 141 KB**. Контент не обрезан; WebP уменьшает вторичный после-старта asset, но не меняет размер отложенного `phaser-engine` chunk.

Captured responsive browser previews at **375×812** and **390×844** show the onboarding, start CTA and top controls without horizontal clipping. The actual blackout demo was additionally checked at **1280×720** and **390×844**: five cells, the focus select and three reserve actions remain readable; action targets are at least **44×44 CSS px** on mobile. Это browser-viewport validation, не замена измерения на физическом устройстве, screen-reader output, manual sheet interaction или throttled network profiling.

## Versioned local save

`schemaVersion=5` и `contentVersion=browser-content-2026.08-master.3` сохраняются внутри `GameState`. При чтении local save browser edition:

| Состояние | Поведение |
|---|---|
| Legacy schema 1–4 | Мигрируется в schema 5, отмечается Archive trace. |
| Новая content version | Сверяется с актуальными safe catalogs; Archive остаётся. |
| Исчезнувший configuration ID | Меняется на видимый canonical default; pending preview удаляется. |
| Исчезнувший service/achievement ID | Активная запись не переносится; факт обновления остаётся в Archive. |
| Отсутствующие canonical tranche fields | Восстанавливаются safe defaults: deterministic seed, dormant event, начальный tutorial, пустой recognition ledger, отключённый local feedback, inactive blackout, пять reserve cells и пустой replay log. |
| Future schema | Не загружается: новый день безопаснее неверной миграции. |

## GamePush boundary

См. [`GAMEPUSH_BROWSER_ADAPTER.md`](GAMEPUSH_BROWSER_ADAPTER.md). Реальный SDK не загружается до готовности test project. В текущей задаче не поступили Project ID, registered test origin, точный browser bootstrap и configured achievement IDs, поэтому adapter намеренно остаётся inert. Это сохраняет initial bundle и не выдаёт local progress за платформенно подтверждённый.
