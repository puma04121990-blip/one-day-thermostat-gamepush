# Performance и content compatibility

## Bundle boundary

Baseline production bundle был одним `index` chunk: **1.96 MB / 475 KB gzip**. После split initial shell состоит из `index` **87 KB / 17 KB gzip**, `react-core` **391 KB / 117 KB gzip** и CSS **92 KB / 17 KB gzip**. Phaser engine вынесен в отдельный `phaser-engine` chunk **1.48 MB / 340 KB gzip** и начинает загружаться только после явного «НАЧАТЬ НАБЛЮДЕНИЕ». Это сохраняет первый экран — объяснение, доступность и маршрутный язык — доступным до загрузки canvas runtime.

> Границы измерены командой `pnpm build` в текущем проекте. Размеры зависят от версии dependency и не являются обещанием сетевой скорости на устройстве игрока.

## Versioned local save

`schemaVersion=2` и `contentVersion=browser-content-2026.08` сохраняются внутри `GameState`. При чтении local save browser edition:

| Состояние | Поведение |
|---|---|
| Legacy schema 1 | Мигрируется в schema 2, отмечается Archive trace. |
| Новая content version | Сверяется с актуальными safe catalogs; Archive остаётся. |
| Исчезнувший configuration ID | Меняется на видимый canonical default; pending preview удаляется. |
| Исчезнувший service/achievement ID | Активная запись не переносится; факт обновления остаётся в Archive. |
| Future schema | Не загружается: новый день безопаснее неверной миграции. |

## GamePush boundary

См. [`GAMEPUSH_BROWSER_ADAPTER.md`](GAMEPUSH_BROWSER_ADAPTER.md). Реальный SDK не загружается до готовности test project. Это сохраняет initial bundle и не выдаёт local progress за платформенно подтверждённый.
