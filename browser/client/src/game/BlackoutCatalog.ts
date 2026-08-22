import type { ReserveActionId, ReserveFocusSensor } from "./types";

export const BLACKOUT_FORESHADOWS: [string, string] = [
  "внешний фронт даёт низкий тон у входной рамы",
  "network layer показывает редкий пульс до отключения"
];

export const BLACKOUT_ACTIONS: Record<ReserveActionId, { id: ReserveActionId; title: string; cost: string; effect: string; consequence: string }> = {
  focus_sense: {
    id: "focus_sense",
    title: "FOCUS SENSE",
    cost: "1 ячейка B",
    effect: "Один узел получает подробное чтение на текущий бит.",
    consequence: "Остальная карта остаётся coarse; это не возвращает активные приборы."
  },
  lock_route: {
    id: "lock_route",
    title: "LOCK ROUTE",
    cost: "1 ячейка B",
    effect: "Механический буфер фиксируется в безопасном пассивном положении.",
    consequence: "Маршрут нельзя перепозиционировать до staged return."
  },
  pulse_shunt: {
    id: "pulse_shunt",
    title: "PULSE SHUNT",
    cost: "1 ячейка B",
    effect: "Короткий импульс направляет доступное surface тепло через видимый путь.",
    consequence: "Эффект короткий; батарея не заменяет сеть."
  }
};

export const RESERVE_FOCUS_SENSORS: Array<{ id: ReserveFocusSensor; label: string; reason: string }> = [
  { id: "surface", label: "ПОВЕРХНОСТЬ", reason: "Показывает, где material buffer ещё удерживает тепло." },
  { id: "vibration", label: "ВИБРАЦИЯ", reason: "Показывает, какая ветвь меняет ритм без активной подачи." },
  { id: "moisture", label: "ВЛАГА", reason: "Показывает, где passive route может сузить влажный след." }
];

export const RETURN_STEPS = [
  { id: "listen", title: "LISTEN", copy: "Network layer возвращает слабый пульс; тяжёлые линии пока не доступны." },
  { id: "stabilize", title: "STABILIZE", copy: "Safe passive route сохраняется, пока дом показывает уставший узел." },
  { id: "reintroduce", title: "REINTRODUCE", copy: "Возвращается один лёгкий контур, а не все приборы одновременно." },
  { id: "observe", title: "OBSERVE", copy: "Preview снова полный: можно сравнить blackout trace и новый baseline." },
  { id: "afterglow", title: "AFTERGLOW", copy: "Archive фиксирует очередь возврата без команды жильцам." }
] as const;
