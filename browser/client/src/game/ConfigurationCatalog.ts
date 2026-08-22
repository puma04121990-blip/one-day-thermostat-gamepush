// Design: Тихая технография — configuration content enumerates visible safe options; it cannot execute arbitrary scripts or write world state.
import type { ConfigurationChannel, ConfigurationDefinition, ConfigurationPreview, ConfigurationState } from "./types";

export const CONFIGURATION_CATALOG: readonly ConfigurationDefinition[] = [
  { id: "firmware.surface_memory", channel: "firmware", title: "Память поверхности", effect: "показывает след поверхности раньше", tradeoff: "воздух перестаёт быть первым акцентом" },
  { id: "firmware.air_first", channel: "firmware", title: "Воздух сначала", effect: "выдвигает пороговый воздух в наблюдение", tradeoff: "влага получает меньше визуального приоритета" },
  { id: "firmware.quiet_window", channel: "firmware", title: "Тихое окно", effect: "раньше показывает ритм ветви", tradeoff: "смена route читается медленнее" },
  { id: "modifier.early_contour", channel: "sensor", title: "Ранний контур", effect: "контур поверхности появляется раньше", tradeoff: "поверхностных следов становится больше" },
  { id: "modifier.moisture_stipple", channel: "sensor", title: "Серебряный штрих", effect: "влага получает штриховой след", tradeoff: "воздушный сигнал становится тише" },
  { id: "modifier.soft_open", channel: "route", title: "Мягкое открытие", effect: "ограничивает прямой импульс", tradeoff: "порог восстанавливается медленнее" },
  { id: "modifier.direct_boost", channel: "route", title: "Прямой импульс", effect: "усиливает прямой маршрут", tradeoff: "ветвь получает больше резонанса" }
] as const;

export const DEFAULT_CONFIGURATION: ConfigurationState = {
  firmwareId: "firmware.surface_memory",
  sensorModifierId: "modifier.early_contour",
  routeModifierId: "modifier.soft_open",
  log: []
};

export function entriesFor(channel: ConfigurationChannel) {
  return CONFIGURATION_CATALOG.filter((entry) => entry.channel === channel);
}

export function findConfiguration(id: string, channel: ConfigurationChannel) {
  return CONFIGURATION_CATALOG.find((entry) => entry.id === id && entry.channel === channel);
}

function currentSelection(configuration: ConfigurationState, channel: ConfigurationChannel) {
  if (channel === "firmware") return configuration.firmwareId;
  return channel === "sensor" ? configuration.sensorModifierId : configuration.routeModifierId;
}

export function previewConfiguration(configuration: ConfigurationState, id: string, channel: ConfigurationChannel, tick: number): ConfigurationPreview {
  const entry = findConfiguration(id, channel);
  if (!entry) return { status: "blocked", selectionId: id, channel, title: "Неизвестная настройка", effect: "Этот ID не входит в безопасный каталог.", tradeoff: "Выбери одну из видимых настроек.", alternative: "Выбери известную настройку из списка.", staleAtTick: tick + 1 };
  if (currentSelection(configuration, channel) === entry.id) return { status: "selected", selectionId: entry.id, channel, title: entry.title, effect: entry.effect, tradeoff: entry.tradeoff, alternative: "Эта настройка уже активна.", staleAtTick: tick + 1 };
  return { status: "valid", selectionId: entry.id, channel, title: entry.title, effect: entry.effect, tradeoff: entry.tradeoff, staleAtTick: tick + 1 };
}
