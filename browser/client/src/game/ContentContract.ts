// Design: authored content can change, but a local day must remain recoverable. Unknown IDs are removed or reset to canonical defaults; no update may create power or a hard fail.
import { DEFAULT_CONFIGURATION, findConfiguration } from "./ConfigurationCatalog";
import { isKnownAchievementId } from "./AchievementCatalog";
import { climateEventDefinition } from "./EventCatalog";
import { isKnownPolicyId } from "./PolicyCatalog";
import { diagnosticFor, scenarioAt, SENSOR_LAYERS } from "./ScenarioCatalog";
import { isKnownServiceTaskId, serviceTemplateFor } from "./ServiceCatalog";
import type { ConfigurationChannel, GameState, SensorLayer } from "./types";

export const SAVE_SCHEMA_VERSION = 4;
export const CONTENT_VERSION = "browser-content-2026.08-master.2";
const CHANNELS: ConfigurationChannel[] = ["firmware", "sensor", "route"];
const PHASES = ["prologue", "warning", "active", "aftermath", "complete"];
const EVENT_STATES = ["dormant", "foreshadow", "warning", "active", "stabilized", "aftermath"];
const TUTORIAL_BEATS = ["observe_heat", "read_vibration", "compare_routes", "remember_consequence", "complete"];

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
  const scenario = scenarioAt(state.chainIndex);
  const sensorLayer = typeof saved.sensorLayer === "string" && SENSOR_LAYERS.some((entry) => entry.id === saved.sensorLayer)
    ? saved.sensorLayer as SensorLayer
    : "heat";
  if (sensorLayer === "heat" && saved.sensorLayer !== undefined && saved.sensorLayer !== "heat") notes.push("Неизвестный sensor layer заменён на видимый слой тепла.");
  const metrics = object(saved.metrics) ?? {};
  const metric = (key: keyof GameState["metrics"], fallback: number) => typeof metrics[key] === "number" ? Math.max(0, Math.min(1, Number(metrics[key]))) : fallback;
  state.metrics = {
    air: metric("air", .34), moisture: metric("moisture", .3), surface: metric("surface", .48), branch: metric("branch", .36),
    network: metric("network", .28), wear: metric("wear", .24), rhythm: metric("rhythm", .48), reserve: metric("reserve", .62)
  };
  state.scenarioSeed = typeof saved.scenarioSeed === "number" && Number.isFinite(saved.scenarioSeed) ? Math.floor(saved.scenarioSeed) : 104729;
  state.sensorLayer = sensorLayer;
  state.scenario = { id: scenario.id, foreshadows: [...scenario.foreshadows], cooldownFamily: scenario.cooldownFamily };
  state.boundaries = [scenario.boundary];
  state.diagnostic = diagnosticFor(scenario, sensorLayer);
  const policy = object(saved.policy) ?? {};
  const active = Array.isArray(policy.active)
    ? policy.active.filter((entry) => object(entry) && typeof object(entry)?.id === "string" && isKnownPolicyId(String(object(entry)?.id)) && typeof object(entry)?.startedTick === "number" && typeof object(entry)?.untilTick === "number") as GameState["policy"]["active"]
    : [];
  if (Array.isArray(policy.active) && active.length !== policy.active.length) notes.push("Неизвестные или неполные policy rules не перенесены в активную очередь.");
  state.policy = { active, log: Array.isArray(policy.log) ? policy.log.filter((entry) => object(entry) && typeof object(entry)?.id === "string" && isKnownPolicyId(String(object(entry)?.id))) as GameState["policy"]["log"] : [] };
  const sourceEvent = object(saved.event);
  const eventDefinition = typeof sourceEvent?.id === "string" ? climateEventDefinition(sourceEvent.id) : undefined;
  const eventState = typeof sourceEvent?.state === "string" && EVENT_STATES.includes(sourceEvent.state) ? sourceEvent.state as GameState["event"]["state"] : "dormant";
  state.event = eventDefinition
    ? {
        id: eventDefinition.id,
        familyId: eventDefinition.familyId,
        seed: typeof sourceEvent?.seed === "number" ? Math.floor(sourceEvent.seed) : state.scenarioSeed,
        state: eventState,
        startedTick: typeof sourceEvent?.startedTick === "number" ? Math.max(0, Math.floor(sourceEvent.startedTick)) : undefined,
        foreshadowsObserved: Array.isArray(sourceEvent?.foreshadowsObserved) ? sourceEvent.foreshadowsObserved.filter((entry) => typeof entry === "string").slice(0, 2) : [],
        selectedAction: sourceEvent?.selectedAction === "safe" || sourceEvent?.selectedAction === "direct" ? sourceEvent.selectedAction : undefined,
        cooldownUntilTick: typeof sourceEvent?.cooldownUntilTick === "number" ? Math.max(0, Math.floor(sourceEvent.cooldownUntilTick)) : 0
      }
    : { id: "event.none", familyId: "none", seed: state.scenarioSeed, state: "dormant", foreshadowsObserved: [], cooldownUntilTick: 0 };
  const tutorial = object(saved.tutorial);
  const completed = Array.isArray(tutorial?.completed) ? tutorial.completed.filter((entry) => typeof entry === "string" && TUTORIAL_BEATS.includes(entry)) as GameState["tutorial"]["completed"] : [];
  const current = typeof tutorial?.current === "string" && TUTORIAL_BEATS.includes(tutorial.current) ? tutorial.current as GameState["tutorial"]["current"] : completed.includes("complete") ? "complete" : "observe_heat";
  state.tutorial = { current, completed, hintsShown: Array.isArray(tutorial?.hintsShown) ? tutorial.hintsShown.filter((entry) => typeof entry === "string" && TUTORIAL_BEATS.includes(entry)) as GameState["tutorial"]["hintsShown"] : [] };
  const stewardship = object(saved.stewardship);
  state.stewardship = {
    recognitions: Array.isArray(stewardship?.recognitions) ? stewardship.recognitions.filter((entry) => object(entry) && typeof object(entry)?.id === "string" && typeof object(entry)?.tick === "number" && typeof object(entry)?.title === "string" && typeof object(entry)?.reason === "string") as GameState["stewardship"]["recognitions"] : [],
    repeatGate: Array.isArray(stewardship?.repeatGate) ? stewardship.repeatGate.filter((entry) => typeof entry === "string") : []
  };
  const feedback = object(saved.feedback);
  state.feedback = {
    consent: feedback?.consent === "accepted" || feedback?.consent === "declined" ? feedback.consent : "undecided",
    entries: feedback?.consent === "accepted" && Array.isArray(feedback.entries) ? feedback.entries.filter((entry) => object(entry) && typeof object(entry)?.tick === "number" && ["cause", "cost", "accessibility"].includes(String(object(entry)?.topic)) && ["clear", "unclear"].includes(String(object(entry)?.understanding))) as GameState["feedback"]["entries"] : []
  };
  if (storedSchema < SAVE_SCHEMA_VERSION) notes.push(`Local save migrated from schema ${storedSchema}.`);
  if (saved.contentVersion !== CONTENT_VERSION) notes.push("Контент обновлён; local day сверено с текущим canonical catalog.");
  state.schemaVersion = SAVE_SCHEMA_VERSION;
  state.contentVersion = CONTENT_VERSION;
  return { state, notes };
}
