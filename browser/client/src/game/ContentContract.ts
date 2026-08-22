// Design: authored content can change, but a local day must remain recoverable. Unknown IDs are removed or reset to canonical defaults; no update may create power or a hard fail.
import { DEFAULT_CONFIGURATION, findConfiguration } from "./ConfigurationCatalog";
import { isKnownAchievementId } from "./AchievementCatalog";
import { isKnownServiceTaskId, serviceTemplateFor } from "./ServiceCatalog";
import type { ConfigurationChannel, GameState } from "./types";

export const SAVE_SCHEMA_VERSION = 2;
export const CONTENT_VERSION = "browser-content-2026.08";
const CHANNELS: ConfigurationChannel[] = ["firmware", "sensor", "route"];
const PHASES = ["prologue", "warning", "active", "aftermath", "complete"];

type MigrationResult = { state: GameState; notes: string[] };

function object(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

export function migrateSavedState(raw: unknown): MigrationResult | undefined {
  const saved = object(raw);
  if (!saved || !Array.isArray(saved.archive) || typeof saved.tick !== "number" || typeof saved.chainIndex !== "number") return undefined;
  const storedSchema = typeof saved.schemaVersion === "number" ? saved.schemaVersion : 1;
  if (storedSchema > SAVE_SCHEMA_VERSION) return undefined;
  const state = JSON.parse(JSON.stringify(saved)) as GameState;
  const notes: string[] = [];
  const config = object(state.configuration) ?? {};
  const select = (key: "firmwareId" | "sensorModifierId" | "routeModifierId", channel: ConfigurationChannel, fallback: string) => {
    const candidate = typeof config[key] === "string" ? config[key] : fallback;
    if (findConfiguration(candidate, channel)) return candidate;
    notes.push(`Настройка ${candidate} больше не входит в текущий безопасный каталог; восстановлен видимый fallback.`);
    return fallback;
  };
  state.configuration = {
    ...DEFAULT_CONFIGURATION,
    firmwareId: select("firmwareId", "firmware", DEFAULT_CONFIGURATION.firmwareId),
    sensorModifierId: select("sensorModifierId", "sensor", DEFAULT_CONFIGURATION.sensorModifierId),
    routeModifierId: select("routeModifierId", "route", DEFAULT_CONFIGURATION.routeModifierId),
    log: Array.isArray(config.log) ? config.log.filter((entry) => object(entry) && typeof object(entry)?.id === "string") as GameState["configuration"]["log"] : []
  };
  const pending = object(config.pending);
  if (pending && typeof pending.selectionId === "string" && CHANNELS.includes(pending.channel as ConfigurationChannel) && findConfiguration(pending.selectionId, pending.channel as ConfigurationChannel)) {
    state.configuration.pending = pending as unknown as GameState["configuration"]["pending"];
  } else if (pending) notes.push("Устаревший queued configuration preview снят до следующего тика.");

  const service = object(state.service) ?? {};
  const unknownTasks = Array.isArray(service.tasks) ? service.tasks.filter((task) => object(task) && typeof object(task)?.id === "string" && !isKnownServiceTaskId(String(object(task)?.id))).length : 0;
  if (unknownTasks) notes.push(`Незнакомые service tasks (${unknownTasks}) оставлены в Archive, но не перенесены в активную очередь.`);
  state.service = {
    tasks: Array.isArray(service.tasks) ? service.tasks.filter((task) => object(task) && typeof object(task)?.id === "string" && isKnownServiceTaskId(String(object(task)?.id))) as GameState["service"]["tasks"] : [],
    unresolvedReasons: Array.isArray(service.unresolvedReasons) ? service.unresolvedReasons.filter((reason) => typeof reason === "string" && serviceTemplateFor(reason)) : [],
    credits: typeof service.credits === "number" ? service.credits : 0,
    review: object(service.review) && typeof object(service.review)?.available === "boolean" ? object(service.review) as unknown as GameState["service"]["review"] : { available: false }
  };
  if (typeof service.pendingTaskId === "string" && state.service.tasks.some((task) => task.id === service.pendingTaskId && !task.resolved)) state.service.pendingTaskId = service.pendingTaskId;

  const achievements = object(state.achievements) ?? {};
  const unlocked = Array.isArray(achievements.unlocked) ? achievements.unlocked.filter((entry) => object(entry) && typeof object(entry)?.id === "string" && isKnownAchievementId(String(object(entry)?.id))) as GameState["achievements"]["unlocked"] : [];
  if (Array.isArray(achievements.unlocked) && unlocked.length !== achievements.unlocked.length) notes.push("Неизвестные achievement IDs не перенесены в активный catalogue.");
  state.achievements = { unlocked, pendingPlatformTags: Array.isArray(achievements.pendingPlatformTags) ? achievements.pendingPlatformTags.filter((id) => typeof id === "string" && unlocked.some((entry) => entry.id === id)) : [] };
  state.chainIndex = Math.max(0, Math.min(2, Math.floor(state.chainIndex)));
  if (!PHASES.includes(state.phase)) { state.phase = "prologue"; notes.push("Неизвестная фаза content восстановлена как безопасное наблюдение."); }
  if (storedSchema < SAVE_SCHEMA_VERSION) notes.push(`Local save migrated from schema ${storedSchema}.`);
  if (saved.contentVersion !== CONTENT_VERSION) notes.push("Контент обновлён; local day сверено с текущим canonical catalog.");
  state.schemaVersion = SAVE_SCHEMA_VERSION;
  state.contentVersion = CONTENT_VERSION;
  return { state, notes };
}
