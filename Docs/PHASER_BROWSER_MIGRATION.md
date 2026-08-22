# Phaser Browser Migration

## Решение

Основной playable путь перенесён на Phaser 3 + TypeScript. Причина практическая: тестирующему игроку нужен URL, а не установка Unity Hub, точной Editor-версии, WebGL module или platform plugin. Canon игры не меняется: T‑3 оптимизирует материальные маршруты дома, жильцы остаются самостоятельными агентами, а любой риск получает наблюдаемые предвестники и recovery baseline.

## Где находится новая версия

`browser/` содержит самостоятельный static Vite project. `ThermostatSimulation.ts` является browser authority, `ThermostatScene.ts` рисует его snapshot в Phaser, а React создаёт доступные controls и Journal. Отрисовка, animation и будущий GamePush SDK не получают прав на изменение simulation напрямую.

| Область | Browser implementation | Состояние legacy Unity |
|---|---|---|
| Three-chain day | `browser/client/src/game/ThermostatSimulation.ts` | Сохранён как reference до полного parity audit. |
| Cutaway visual | Phaser scene + generated original cutaway art | URP showcase больше не нужен игроку для теста. |
| Save/profile | browser localStorage, отдельные keys | C# DTO — source reference для следующих migration tests. |
| Accessibility | HTML controls, keyboard, low-sensory, reduced motion, text scale | Unity profile остаётся historical implementation. |
| GamePush | Planned browser mirror after credentials/test project | Unity conditional adapter не включается для browser release. |

## Неперенесённое не объявляется готовым

Browser edition уже содержит playable vertical slice, local first day и доступность. Платформенная cloud sync, полный firmware/modifier catalog, service follow-up execution и migration tests должны быть портированы дальше. Пока они не перенесены, README и release path не должны обещать feature parity с legacy Unity prototype.
