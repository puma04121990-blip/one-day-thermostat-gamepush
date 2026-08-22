import { DEFAULT_CONFIGURATION, findConfiguration, previewConfiguration } from "./ConfigurationCatalog";
import { ACHIEVEMENT_CATALOG, EMPTY_ACHIEVEMENTS, isAchievementTriggered } from "./AchievementCatalog";
import { CONTENT_VERSION, migrateSavedState, SAVE_SCHEMA_VERSION } from "./ContentContract";
import { climateEventDefinition, isBranchEmergencyEligible } from "./EventCatalog";
import { isKnownPolicyId, policyDefinition, previewPolicy } from "./PolicyCatalog";
import { diagnosticFor, scenarioAt, SENSOR_LAYERS } from "./ScenarioCatalog";
import { createServiceTask } from "./ServiceCatalog";
import type { ConfigurationChannel, ConfigurationPreview, DiagnosticStatus, EmergencyAction, EventPhase, FeedbackConsent, FeedbackTopic, GameState, JournalEntry, PolicyPreview, RouteKind, SensorLayer, TutorialBeatId } from "./types";

const SAVE_KEY = "one-day-thermostat.phaser.save.v1";
const TICK_MS = 200;
const SERVICE_REASON_BY_SCENARIO: Record<string, "cost.branch_26_resonance" | "cost.kitchen_queue" | "cost.second_network_peak"> = {
  "scenario.arcady_threshold": "cost.branch_26_resonance",
  "scenario.lera_kitchen": "cost.kitchen_queue",
  "scenario.quiet_cycle": "cost.second_network_peak"
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const newConfiguration = () => ({ ...DEFAULT_CONFIGURATION, log: [] });
const newService = () => ({ tasks: [], unresolvedReasons: [], credits: 0, review: { available: false } });
const newAchievements = () => ({ ...EMPTY_ACHIEVEMENTS, unlocked: [], pendingPlatformTags: [] });
const newPolicy = () => ({ active: [], log: [] });
const newEvent = () => ({ id: "event.none", familyId: "none", seed: 104729, state: "dormant" as const, foreshadowsObserved: [], cooldownUntilTick: 0 });
const newTutorial = () => ({ current: "observe_heat" as const, completed: [], hintsShown: [] });
const newStewardship = () => ({ recognitions: [], repeatGate: [] });
const newFeedback = () => ({ consent: "undecided" as const, entries: [] });

export class ThermostatSimulation {
  private state: GameState;
  private accumulator = 0;
  private phaseTicks = 0;

  constructor() { this.state = this.createInitial(); this.restore(); }

  public start() {
    if (this.state.started) return;
    this.state.started = true;
    this.append("trace", "Начало наблюдения", "Дом не требует подчинения жильцов. Здесь можно собрать только материальный маршрут.");
    this.persist();
  }

  public chooseRoute(route: RouteKind) {
    if (!this.state.started || this.state.phase !== "warning" || this.state.dayComplete) return;
    if (this.state.event.state === "warning") { this.chooseEmergency(route === "careful" ? "safe" : "direct"); return; }
    const scenario = scenarioAt(this.state.chainIndex);
    const option = route === "careful" ? scenario.careful : scenario.direct;
    const modifier = this.state.configuration.routeModifierId;
    const adjustedCost = route === "direct" && modifier === "modifier.soft_open" ? "порог восстановится медленнее; импульс ветви ограничен" : option.cost;
    this.state.phase = "active";
    this.state.options = [];
    this.phaseTicks = 0;
    this.append("route", option.title, `${option.benefit}; цена: ${adjustedCost}.`);
    if (route === "direct") {
      this.state.unresolved.push(modifier === "modifier.direct_boost" ? "ветвь 26 получила усиленный резонанс" : adjustedCost);
      const reason = SERVICE_REASON_BY_SCENARIO[scenario.id];
      if (!this.state.service.unresolvedReasons.includes(reason)) this.state.service.unresolvedReasons.push(reason);
      this.state.metrics.branch = clamp(this.state.metrics.branch + (modifier === "modifier.direct_boost" ? .12 : modifier === "modifier.soft_open" ? .025 : .07));
      this.state.metrics.network = clamp(this.state.metrics.network + .08);
      this.state.metrics.wear = clamp(this.state.metrics.wear + .06);
    } else {
      this.state.metrics.rhythm = clamp(this.state.metrics.rhythm + .04);
      this.recordStewardship(`careful.${scenario.id}`, "Бережный маршрут", "Маршрут принял видимую цену и сохранил окно recovery без награды за человека.");
    }
    this.completeTutorial("compare_routes");
    this.refreshDiagnostic();
    this.persist();
  }

  private chooseEmergency(action: EmergencyAction) {
    const event = climateEventDefinition(this.state.event.id);
    if (!event || this.state.event.state !== "warning" || !this.state.started) return;
    this.state.event.state = "active";
    this.state.event.selectedAction = action;
    this.state.phase = "active";
    this.state.options = [];
    this.phaseTicks = 0;
    const choice = action === "safe" ? event.safe : event.direct;
    this.append("event", choice.title, `${choice.benefit}; цена: ${choice.cost}. ${event.reason}`);
    if (action === "safe") {
      this.state.metrics.branch = clamp(this.state.metrics.branch - .07);
      this.state.metrics.rhythm = clamp(this.state.metrics.rhythm + .05);
      this.recordStewardship("emergency.branch26.safe", "Тихая стабилизация", "Safe-flow и буфер сохранили recovery-window без попытки вернуть идеальный режим.");
    } else {
      this.state.metrics.branch = clamp(this.state.metrics.branch - .13);
      this.state.metrics.network = clamp(this.state.metrics.network + .04);
      if (!this.state.service.unresolvedReasons.includes("cost.branch_26_resonance")) this.state.service.unresolvedReasons.push("cost.branch_26_resonance");
    }
    this.completeTutorial("remember_consequence");
    this.persist();
  }

  public previewConfiguration(id: string, channel: ConfigurationChannel): ConfigurationPreview { return previewConfiguration(this.state.configuration, id, channel, this.state.tick); }

  public queueConfiguration(preview: ConfigurationPreview) {
    if (preview.status !== "valid" || preview.staleAtTick !== this.state.tick + 1 || !findConfiguration(preview.selectionId, preview.channel)) return false;
    this.state.configuration.pending = { ...preview };
    this.persist();
    return true;
  }

  public selectSensor(layer: SensorLayer) {
    if (!SENSOR_LAYERS.some((entry) => entry.id === layer)) return false;
    this.state.sensorLayer = layer;
    if (layer === "heat") this.completeTutorial("observe_heat");
    if (layer === "vibration") this.completeTutorial("read_vibration");
    this.refreshDiagnostic();
    this.persist();
    return true;
  }

  public previewPolicy(id: string): PolicyPreview { return previewPolicy(this.state, id); }

  public queuePolicy(preview: PolicyPreview) {
    if (preview.status !== "valid" || preview.staleAtTick !== this.state.tick + 1 || !isKnownPolicyId(preview.policyId)) return false;
    this.state.policy.pending = { ...preview };
    this.persist();
    return true;
  }

  public queueServiceRecovery(taskId: string) {
    const task = this.state.service.tasks.find((entry) => entry.id === taskId && !entry.resolved);
    if (!task || this.state.service.pendingTaskId) return false;
    this.state.service.pendingTaskId = taskId;
    this.persist();
    return true;
  }

  public setFeedbackConsent(consent: FeedbackConsent) {
    this.state.feedback.consent = consent;
    if (consent === "declined") this.state.feedback.entries = [];
    this.append("feedback", "Тепловой след: выбор сохранён", consent === "accepted" ? "Локальные, анонимные отметки понимания можно сохранить и экспортировать вручную." : "Никакие feedback-отметки не будут собираться.");
    this.persist();
  }

  public recordFeedback(topic: FeedbackTopic, understanding: "clear" | "unclear") {
    if (this.state.feedback.consent !== "accepted") return false;
    this.state.feedback.entries.push({ tick: this.state.tick, topic, understanding });
    this.persist();
    return true;
  }

  public exportFeedback() {
    return JSON.stringify({ schemaVersion: 1, consent: this.state.feedback.consent, entries: this.state.feedback.entries }, null, 2);
  }

  public markPlatformAchievementSynced(achievementId: string) {
    if (!this.state.achievements.unlocked.some((entry) => entry.id === achievementId)) return false;
    const index = this.state.achievements.pendingPlatformTags.indexOf(achievementId);
    if (index < 0) return false;
    this.state.achievements.pendingPlatformTags.splice(index, 1);
    this.persist();
    return true;
  }

  public advance(deltaMs: number) {
    if (!this.state.started || (this.state.dayComplete && !this.state.service.pendingTaskId)) return;
    this.accumulator += Math.min(250, Math.max(0, deltaMs));
    while (this.accumulator >= TICK_MS) { this.accumulator -= TICK_MS; this.step(); }
  }

  public snapshot(): GameState { return JSON.parse(JSON.stringify(this.state)) as GameState; }

  public reset() {
    this.state = this.createInitial();
    this.accumulator = 0;
    this.phaseTicks = 0;
    this.persist();
  }

  private createInitial(): GameState {
    const scenario = scenarioAt(0);
    return {
      schemaVersion: SAVE_SCHEMA_VERSION,
      contentVersion: CONTENT_VERSION,
      started: false,
      phase: "prologue",
      chainIndex: 0,
      tick: 0,
      scenarioSeed: 104729,
      chainTitle: scenario.title,
      trace: scenario.trace,
      caption: scenario.caption,
      options: [],
      archive: [],
      unresolved: [],
      configuration: newConfiguration(),
      service: newService(),
      achievements: newAchievements(),
      metrics: { air: .34, moisture: .3, surface: .48, branch: .36, network: .28, wear: .24, rhythm: .48, reserve: .62 },
      sensorLayer: "heat",
      diagnostic: diagnosticFor(scenario, "heat"),
      scenario: { id: scenario.id, foreshadows: [...scenario.foreshadows], cooldownFamily: scenario.cooldownFamily },
      boundaries: [scenario.boundary],
      policy: newPolicy(),
      event: newEvent(),
      tutorial: newTutorial(),
      stewardship: newStewardship(),
      feedback: newFeedback(),
      dayComplete: false
    };
  }

  private step() {
    this.state.tick += 1;
    this.phaseTicks += 1;
    this.commitPendingConfiguration();
    this.commitPendingPolicy();
    this.commitPendingService();
    this.materializeServiceTasks();
    this.updateMetrics();
    this.advancePolicies();
    this.advanceEventDirector();
    if (this.state.phase === "prologue" && this.phaseTicks >= 7) {
      const scenario = scenarioAt(this.state.chainIndex);
      this.state.phase = "warning";
      this.state.options = [scenario.careful, scenario.direct];
      this.phaseTicks = 0;
      this.append("trace", "Два маршрута видны", `${scenario.foreshadows[0]} ${scenario.foreshadows[1]} Выбери путь по последствиям; оба продолжают день.`);
    } else if (this.state.phase === "active" && this.phaseTicks >= 6) {
      this.state.phase = "aftermath";
      this.phaseTicks = 0;
      const activeEvent = climateEventDefinition(this.state.event.id);
      if (this.state.event.state === "active" && activeEvent) {
        this.state.event.state = "stabilized";
        this.append("archive", activeEvent.title, this.state.event.selectedAction === "safe" ? activeEvent.safeOutcome : activeEvent.directOutcome);
      } else {
        const latestRoute = this.state.archive.filter((entry) => entry.tone === "route").at(-1)?.title;
        const scenario = scenarioAt(this.state.chainIndex);
        this.append("archive", scenario.archive, latestRoute === scenario.careful.title ? scenario.carefulResult : scenario.directResult);
      }
    } else if (this.state.phase === "aftermath" && this.phaseTicks >= 8) {
      if (this.state.event.state === "stabilized") {
        this.state.event.state = "aftermath";
        this.state.event.cooldownUntilTick = this.state.tick + (climateEventDefinition(this.state.event.id)?.cooldownTicks ?? 0);
      }
      this.advanceChain();
    }
    this.refreshDiagnostic();
    this.offerEndOfDayReview();
    this.progressAchievements();
    this.persist();
  }

  private advanceChain() {
    if (this.state.chainIndex >= 2) {
      this.state.phase = "complete";
      this.state.dayComplete = true;
      this.state.chainTitle = "Ночной baseline собран";
      this.state.trace = "У дома есть следующий день: следы сохранены, а видимые service tasks можно завершить позднее.";
      this.state.caption = "День не заканчивается победой над кем-то. Он заканчивается новым, восстанавливаемым baseline.";
      this.append("archive", "День собран", "Archive сохранил маршрут, последствия и возможность вернуться к материальным задачам.");
      return;
    }
    this.state.chainIndex += 1;
    const scenario = scenarioAt(this.state.chainIndex);
    this.state.phase = "prologue";
    this.state.chainTitle = scenario.title;
    this.state.trace = scenario.trace;
    this.state.caption = scenario.caption;
    this.state.options = [];
    this.state.scenario = { id: scenario.id, foreshadows: [...scenario.foreshadows], cooldownFamily: scenario.cooldownFamily };
    this.state.boundaries = [scenario.boundary];
    this.state.sensorLayer = "heat";
    this.state.event = { ...newEvent(), seed: this.state.scenarioSeed, cooldownUntilTick: this.state.event.cooldownUntilTick };
    this.phaseTicks = 0;
    this.refreshDiagnostic();
    this.append("trace", scenario.title, `Новая цепочка начинается с двух независимых предвестников: ${scenario.foreshadows.join(" ")}`);
  }

  private advanceEventDirector() {
    if (isBranchEmergencyEligible(this.state)) {
      const event = climateEventDefinition("event.branch_26_quiet");
      if (!event) return;
      this.state.event = {
        id: event.id,
        familyId: event.familyId,
        seed: this.state.scenarioSeed,
        state: "foreshadow",
        startedTick: this.state.tick,
        foreshadowsObserved: [...event.foreshadows],
        cooldownUntilTick: this.state.tick + event.cooldownTicks
      };
      this.append("event", "Предвестники ветви 26", `${event.foreshadows[0]} ${event.foreshadows[1]} Сначала можно выбрать тихую стабилизацию или короткую безопасную отсечку.`);
      return;
    }
    if (this.state.event.state !== "foreshadow" || !this.state.event.startedTick || this.state.tick - this.state.event.startedTick < 3) return;
    const event = climateEventDefinition(this.state.event.id);
    if (!event) return;
    this.state.event.state = "warning";
    this.state.options = [event.safe, event.direct];
    this.append("event", "Ветвь 26: локальное предупреждение", `${event.reason} Два безопасных маршрута видимы до escalation.`);
  }

  private completeTutorial(beat: TutorialBeatId) {
    if (this.state.tutorial.completed.includes(beat)) return;
    this.state.tutorial.completed.push(beat);
    const order: TutorialBeatId[] = ["observe_heat", "read_vibration", "compare_routes", "remember_consequence", "complete"];
    const next = order[order.indexOf(beat) + 1];
    this.state.tutorial.current = next ?? "complete";
    const copy = beat === "read_vibration"
      ? "Вибрация стала вторым независимым источником гипотезы."
      : beat === "compare_routes"
        ? "Маршруты различаются ценой, а не правильностью."
        : "Дом сохранил причинный след без оценки игрока.";
    this.append("tutorial", "Туториал: след сохранён", copy);
  }

  private recordStewardship(id: string, title: string, reason: string) {
    if (this.state.stewardship.repeatGate.includes(id)) return;
    this.state.stewardship.repeatGate.push(id);
    this.state.stewardship.recognitions.push({ id, tick: this.state.tick, title, reason });
    this.append("stewardship", title, reason);
  }

  private updateMetrics() {
    const phaseModifier: Record<EventPhase, number> = { prologue: .015, warning: .02, active: -.018, aftermath: -.01, complete: -.004 };
    const direction = phaseModifier[this.state.phase];
    this.state.metrics.air = clamp(this.state.metrics.air + direction * (this.state.chainIndex === 0 ? 1 : -.3));
    this.state.metrics.moisture = clamp(this.state.metrics.moisture + direction * (this.state.chainIndex === 1 ? 1.4 : -.2));
    const firmwareSurfaceWeight = this.state.configuration.firmwareId === "firmware.surface_memory" ? 1.2 : 1;
    const sensorSurfaceWeight = this.state.configuration.sensorModifierId === "modifier.early_contour" ? 1.1 : 1;
    this.state.metrics.surface = clamp(this.state.metrics.surface + direction * (this.state.chainIndex === 2 ? 1.1 : .15) * firmwareSurfaceWeight * sensorSurfaceWeight);
    this.state.metrics.branch = clamp(this.state.metrics.branch + direction * (this.state.chainIndex === 0 ? .8 : .25));
    this.state.metrics.network = clamp(this.state.metrics.network + direction * (this.state.chainIndex === 1 || this.state.chainIndex === 2 ? .72 : .2));
    this.state.metrics.wear = clamp(this.state.metrics.wear + direction * .45 + (this.state.phase === "active" ? .012 : 0));
    this.state.metrics.rhythm = clamp(this.state.metrics.rhythm + (this.state.phase === "active" ? -.012 : .006));
    this.state.metrics.reserve = clamp(this.state.metrics.reserve + (this.state.phase === "complete" ? .006 : -.001));
  }

  private commitPendingConfiguration() {
    const pending = this.state.configuration.pending;
    if (!pending) return;
    delete this.state.configuration.pending;
    if (pending.staleAtTick !== this.state.tick || pending.status !== "valid" || !findConfiguration(pending.selectionId, pending.channel)) return;
    if (pending.channel === "firmware") this.state.configuration.firmwareId = pending.selectionId;
    if (pending.channel === "sensor") this.state.configuration.sensorModifierId = pending.selectionId;
    if (pending.channel === "route") this.state.configuration.routeModifierId = pending.selectionId;
    this.state.configuration.log.push({ tick: this.state.tick, id: pending.selectionId, title: pending.title });
    this.append("configuration", pending.title, `${pending.effect}; цена: ${pending.tradeoff}.`);
  }

  private commitPendingPolicy() {
    const pending = this.state.policy.pending;
    if (!pending) return;
    delete this.state.policy.pending;
    const livePreview = previewPolicy(this.state, pending.policyId);
    if (pending.staleAtTick !== this.state.tick || livePreview.status !== "valid") {
      this.state.policy.log.push({ tick: this.state.tick, id: pending.policyId, title: pending.title, state: "blocked" });
      this.append("policy", "Governor остановил rule", `${livePreview.reason ?? "Контекст правила изменился."} ${livePreview.alternative ?? "Выбери видимый ручной маршрут."}`);
      return;
    }
    const definition = policyDefinition(pending.policyId);
    if (!definition) return;
    this.state.policy.active.push({ id: definition.id, startedTick: this.state.tick, untilTick: this.state.tick + 6 });
    this.state.policy.log.push({ tick: this.state.tick, id: definition.id, title: definition.title, state: "active" });
    this.append("policy", definition.title, `WHEN: ${definition.when}. THEN: ${definition.then}. UNTIL: ${definition.until}. Цена: ${definition.price}.`);
  }

  private advancePolicies() {
    for (const active of [...this.state.policy.active]) {
      if (active.untilTick > this.state.tick) continue;
      const definition = policyDefinition(active.id);
      this.state.policy.active = this.state.policy.active.filter((entry) => entry.id !== active.id);
      this.state.policy.log.push({ tick: this.state.tick, id: active.id, title: definition?.title ?? active.id, state: "ended" });
      this.append("policy", `${definition?.title ?? "Policy"}: stop condition`, `${definition?.until ?? "Условие остановки"} достигнуто; правило не продолжает действовать скрыто.`);
    }
  }

  private materializeServiceTasks() {
    for (const reasonId of this.state.service.unresolvedReasons) {
      const task = createServiceTask(reasonId, this.state.tick);
      if (!task || this.state.service.tasks.some((entry) => entry.id === task.id)) continue;
      this.state.service.tasks.push(task);
      this.append("service", "Задача обслуживания доступна", `${task.trace}: ${task.action}. Это материальная задача, не оценка жильцов.`);
    }
  }

  private commitPendingService() {
    const taskId = this.state.service.pendingTaskId;
    if (!taskId) return;
    delete this.state.service.pendingTaskId;
    const task = this.state.service.tasks.find((entry) => entry.id === taskId && !entry.resolved);
    if (!task) return;
    task.resolved = true;
    task.completedTick = this.state.tick;
    this.state.service.credits += 1;
    if (task.componentId === "component.branch_26") this.state.metrics.branch = clamp(this.state.metrics.branch - .12);
    if (task.componentId === "component.kitchen_drain") this.state.metrics.moisture = clamp(this.state.metrics.moisture - .12);
    if (task.componentId === "component.network_main") this.state.metrics.network = clamp(this.state.metrics.network - .12);
    this.state.metrics.wear = clamp(this.state.metrics.wear - .06);
    this.append("service", task.action, task.outcome);
    if (this.state.dayComplete) this.offerEndOfDayReview(true);
  }

  private offerEndOfDayReview(force = false) {
    if (!this.state.dayComplete || (this.state.service.review.available && !force)) return;
    const openTasks = this.state.service.tasks.filter((task) => !task.resolved).length;
    const text = openTasks === 0
      ? "Все видимые service traces получили bounded recovery. Новый baseline остаётся восстанавливаемым."
      : "День собран, а открытые материальные задачи остаются видимыми. Это не hard fail.";
    this.state.service.review = openTasks === 0
      ? { available: true, key: "review.day.stewardship_complete", text }
      : { available: true, key: "review.day.service_follow_up_open", text };
    this.append("archive", "Обзор дня", text);
  }

  private progressAchievements() {
    for (const definition of ACHIEVEMENT_CATALOG) {
      if (!isAchievementTriggered(this.state, definition) || this.state.achievements.unlocked.some((entry) => entry.id === definition.id)) continue;
      this.state.achievements.unlocked.push({ id: definition.id, unlockedTick: this.state.tick });
      this.state.achievements.pendingPlatformTags.push(definition.id);
      this.append("achievement", definition.title, definition.description);
    }
  }

  private diagnosticStatus(): DiagnosticStatus {
    if (this.state.metrics.wear >= .86) return "protective";
    if (this.state.metrics.wear >= .68) return "warning";
    if (this.state.metrics.wear >= .5) return "strained";
    return this.state.phase === "prologue" ? "stable" : "elevated";
  }

  private refreshDiagnostic() {
    const scenario = scenarioAt(this.state.chainIndex);
    this.state.diagnostic = { ...diagnosticFor(scenario, this.state.sensorLayer), status: this.diagnosticStatus() };
  }

  private append(tone: JournalEntry["tone"], title: string, body: string) { this.state.archive.push({ tick: this.state.tick, tone, title, body }); }

  private persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.state)); } catch { /* Local-first save is optional in restrictive contexts. */ } }

  private restore() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const migration = migrateSavedState(JSON.parse(raw));
      if (!migration) return;
      this.state = migration.state;
      if (migration.notes.length) this.append("trace", "Контент обновлён", migration.notes.join(" "));
      this.refreshDiagnostic();
      this.persist();
    } catch { /* Corrupt local data safely falls back to a new day. */ }
  }
}
