import { DEFAULT_CONFIGURATION, findConfiguration, previewConfiguration } from "./ConfigurationCatalog";
import { ACHIEVEMENT_CATALOG, EMPTY_ACHIEVEMENTS, isAchievementTriggered } from "./AchievementCatalog";
import { BLACKOUT_ACTIONS, BLACKOUT_FORESHADOWS, RESERVE_FOCUS_SENSORS, RETURN_STEPS } from "./BlackoutCatalog";
import { CONTENT_VERSION, migrateSavedState, SAVE_SCHEMA_VERSION } from "./ContentContract";
import { climateEventDefinition, isBranchEmergencyEligible } from "./EventCatalog";
import { isKnownPolicyId, policyDefinition, previewPolicy } from "./PolicyCatalog";
import { diagnosticFor, scenarioAt, SENSOR_LAYERS } from "./ScenarioCatalog";
import { createServiceTask } from "./ServiceCatalog";
import type { ConfigurationChannel, ConfigurationPreview, DiagnosticStatus, EmergencyAction, EventPhase, FeedbackConsent, FeedbackTopic, GameState, JournalEntry, PolicyPreview, ReplayCommand, ReplayRecord, ReserveActionId, ReserveFocusSensor, RouteKind, SensorLayer, TutorialBeatId } from "./types";

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
const newBlackout = () => ({ phase: "inactive" as const, reserveCells: 5, foreshadows: [...BLACKOUT_FORESHADOWS] as [string, string], usedActions: [], passivePreparation: false });
const newReplay = () => ({ version: 1 as const, commands: [] });

export class ThermostatSimulation {
  private state: GameState;
  private accumulator = 0;
  private phaseTicks = 0;
  private recordingReplay = true;
  private persistenceEnabled = true;

  constructor(options: { restore?: boolean; scenarioSeed?: number; recordingReplay?: boolean } = {}) {
    this.recordingReplay = options.recordingReplay ?? true;
    this.persistenceEnabled = options.restore !== false;
    this.state = this.createInitial(options.scenarioSeed);
    if (options.restore !== false) this.restore();
  }

  private recordCommand(command: ReplayCommand) {
    if (this.recordingReplay) this.state.replay.commands.push(command);
  }

  public start() {
    if (this.state.started) return;
    this.state.started = true;
    this.recordCommand({ tick: this.state.tick, kind: "start" });
    this.append("trace", "Начало наблюдения", "Дом не требует подчинения жильцов. Здесь можно собрать только материальный маршрут.");
    this.persist();
  }

  public chooseRoute(route: RouteKind) {
    if (!this.state.started || this.state.phase !== "warning" || this.state.dayComplete || this.state.blackout.phase !== "inactive") return;
    this.recordCommand({ tick: this.state.tick, kind: "route", route });
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
    if (this.state.blackout.phase !== "inactive" || preview.status !== "valid" || preview.staleAtTick !== this.state.tick + 1 || !findConfiguration(preview.selectionId, preview.channel)) return false;
    this.state.configuration.pending = { ...preview };
    this.recordCommand({ tick: this.state.tick, kind: "configuration", id: preview.selectionId, channel: preview.channel });
    this.persist();
    return true;
  }

  public selectSensor(layer: SensorLayer) {
    if (this.state.blackout.phase !== "inactive" || !SENSOR_LAYERS.some((entry) => entry.id === layer)) return false;
    this.state.sensorLayer = layer;
    this.recordCommand({ tick: this.state.tick, kind: "sensor", layer });
    if (layer === "heat") this.completeTutorial("observe_heat");
    if (layer === "vibration") this.completeTutorial("read_vibration");
    this.refreshDiagnostic();
    this.persist();
    return true;
  }

  public previewPolicy(id: string): PolicyPreview { return previewPolicy(this.state, id); }

  public queuePolicy(preview: PolicyPreview) {
    if (this.state.blackout.phase !== "inactive" || preview.status !== "valid" || preview.staleAtTick !== this.state.tick + 1 || !isKnownPolicyId(preview.policyId)) return false;
    this.state.policy.pending = { ...preview };
    this.recordCommand({ tick: this.state.tick, kind: "policy", id: preview.policyId });
    this.persist();
    return true;
  }

  public queueServiceRecovery(taskId: string) {
    const task = this.state.service.tasks.find((entry) => entry.id === taskId && !entry.resolved);
    if (this.state.blackout.phase !== "inactive" || !task || this.state.service.pendingTaskId) return false;
    this.state.service.pendingTaskId = taskId;
    this.recordCommand({ tick: this.state.tick, kind: "service", taskId });
    this.persist();
    return true;
  }

  public setFeedbackConsent(consent: FeedbackConsent) {
    this.state.feedback.consent = consent;
    this.recordCommand({ tick: this.state.tick, kind: "feedback_consent", consent });
    if (consent === "declined") this.state.feedback.entries = [];
    this.append("feedback", "Тепловой след: выбор сохранён", consent === "accepted" ? "Локальные, анонимные отметки понимания можно сохранить и экспортировать вручную." : "Никакие feedback-отметки не будут собираться.");
    this.persist();
  }

  public recordFeedback(topic: FeedbackTopic, understanding: "clear" | "unclear") {
    if (this.state.feedback.consent !== "accepted") return false;
    this.state.feedback.entries.push({ tick: this.state.tick, topic, understanding });
    this.recordCommand({ tick: this.state.tick, kind: "feedback", topic, understanding });
    this.persist();
    return true;
  }

  public exportFeedback() {
    return JSON.stringify({ schemaVersion: 1, consent: this.state.feedback.consent, entries: this.state.feedback.entries }, null, 2);
  }

  public useReserve(action: ReserveActionId, focus?: ReserveFocusSensor) {
    const blackout = this.state.blackout;
    const actionable = blackout.phase === "reserve_triage" || blackout.phase === "dark_baseline";
    if (!actionable || blackout.reserveCells <= 0 || blackout.usedActions.length >= 3 || blackout.usedActions.includes(action) || !BLACKOUT_ACTIONS[action]) return false;
    if (action === "focus_sense" && (!focus || !RESERVE_FOCUS_SENSORS.some((entry) => entry.id === focus))) return false;
    blackout.reserveCells -= 1;
    blackout.usedActions.push(action);
    if (action === "focus_sense" && focus) {
      blackout.focusedSensor = focus;
      this.state.sensorLayer = focus;
      this.append("event", BLACKOUT_ACTIONS[action].title, `${BLACKOUT_ACTIONS[action].effect} Фокус: ${focus.toUpperCase()}. ${BLACKOUT_ACTIONS[action].consequence}`);
    } else if (action === "lock_route") {
      blackout.passivePreparation = true;
      this.state.metrics.branch = clamp(this.state.metrics.branch - .05);
      this.state.metrics.wear = clamp(this.state.metrics.wear - .04);
      this.append("event", BLACKOUT_ACTIONS[action].title, `${BLACKOUT_ACTIONS[action].effect} ${BLACKOUT_ACTIONS[action].consequence}`);
    } else {
      this.state.metrics.surface = clamp(this.state.metrics.surface + .06);
      this.state.metrics.air = clamp(this.state.metrics.air + .035);
      this.append("event", BLACKOUT_ACTIONS[action].title, `${BLACKOUT_ACTIONS[action].effect} ${BLACKOUT_ACTIONS[action].consequence}`);
    }
    this.state.metrics.reserve = blackout.reserveCells / 5;
    this.recordCommand({ tick: this.state.tick, kind: "reserve", action, focus });
    this.persist();
    return true;
  }

  public exportReplay() {
    const record: ReplayRecord = {
      version: 1,
      schemaVersion: this.state.schemaVersion,
      contentVersion: this.state.contentVersion,
      scenarioSeed: this.state.scenarioSeed,
      finalTick: this.state.tick,
      commands: this.state.replay.commands.map((entry) => ({ ...entry }))
    };
    return JSON.stringify(record, null, 2);
  }

  public replayDeterministically() {
    const replayed = ThermostatSimulation.replay(JSON.parse(this.exportReplay()) as ReplayRecord);
    return Boolean(replayed && JSON.stringify(replayed.snapshot()) === JSON.stringify(this.snapshot()));
  }

  public static replay(record: ReplayRecord) {
    if (record.version !== 1 || !Number.isInteger(record.scenarioSeed) || !Number.isInteger(record.finalTick) || record.finalTick < 0 || !Array.isArray(record.commands)) return undefined;
    const commands = [...record.commands].sort((a, b) => a.tick - b.tick);
    if (commands.some((entry, index) => !Number.isInteger(entry.tick) || entry.tick < 0 || entry.tick > record.finalTick || (index > 0 && entry.tick < commands[index - 1].tick))) return undefined;
    const replayed = new ThermostatSimulation({ restore: false, scenarioSeed: record.scenarioSeed, recordingReplay: false });
    let index = 0;
    for (let tick = 0; tick <= record.finalTick; tick += 1) {
      while (commands[index]?.tick === tick) replayed.applyReplayCommand(commands[index++]);
      if (tick < record.finalTick) replayed.advance(TICK_MS);
    }
    if (index !== commands.length) return undefined;
    replayed.state.replay.commands = commands.map((entry) => ({ ...entry }));
    return replayed;
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

  private applyReplayCommand(command: ReplayCommand) {
    if (command.kind === "start") this.start();
    if (command.kind === "route") this.chooseRoute(command.route);
    if (command.kind === "sensor") this.selectSensor(command.layer);
    if (command.kind === "configuration") this.queueConfiguration(this.previewConfiguration(command.id, command.channel));
    if (command.kind === "policy") this.queuePolicy(this.previewPolicy(command.id));
    if (command.kind === "service") this.queueServiceRecovery(command.taskId);
    if (command.kind === "reserve") this.useReserve(command.action, command.focus);
    if (command.kind === "feedback_consent") this.setFeedbackConsent(command.consent);
    if (command.kind === "feedback") this.recordFeedback(command.topic, command.understanding);
  }

  public snapshot(): GameState { return JSON.parse(JSON.stringify(this.state)) as GameState; }

  public reset() {
    this.state = this.createInitial();
    this.accumulator = 0;
    this.phaseTicks = 0;
    this.persist();
  }

  public prepareBlackoutDemo() {
    if (this.state.started) return;
    this.start();
    for (let index = 0; index < 7; index += 1) this.advance(TICK_MS);
    this.chooseRoute("careful");
    for (let index = 0; index < 14; index += 1) this.advance(TICK_MS);
    for (let index = 0; index < 7; index += 1) this.advance(TICK_MS);
    this.chooseRoute("careful");
    for (let index = 0; index < 14; index += 1) this.advance(TICK_MS);
    this.selectSensor("vibration");
    for (let index = 0; index < 7; index += 1) this.advance(TICK_MS);
  }

  private createInitial(seed = 104729): GameState {
    const scenario = scenarioAt(0);
    return {
      schemaVersion: SAVE_SCHEMA_VERSION,
      contentVersion: CONTENT_VERSION,
      started: false,
      phase: "prologue",
      chainIndex: 0,
      tick: 0,
      scenarioSeed: seed,
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
      blackout: newBlackout(),
      replay: newReplay(),
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
    if (this.advanceBlackout()) {
      this.refreshDiagnostic();
      this.persist();
      return;
    }
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

  private advanceBlackout() {
    const blackout = this.state.blackout;
    if (blackout.phase === "inactive") {
      const eligible = this.state.chainIndex === 2 && this.state.phase === "prologue" && this.phaseTicks >= 3 && this.state.tutorial.completed.includes("read_vibration");
      if (!eligible) return false;
      blackout.phase = "grid_warning";
      blackout.startedTick = this.state.tick;
      blackout.phaseStartedTick = this.state.tick;
      blackout.reserveCells = 5;
      blackout.foreshadows = [...BLACKOUT_FORESHADOWS];
      this.state.trace = "Сеть даёт редкий пульс, а входная рама отвечает низким внешним тоном. У дома есть время выбрать пассивный порядок.";
      this.state.caption = "[СЕТЬ: РЕДКИЙ ПУЛЬС] [РАМА: НИЗКИЙ ВНЕШНИЙ ТОН]";
      this.append("event", "Grid Warning: пассивный порядок", `${blackout.foreshadows[0]}; ${blackout.foreshadows[1]}. Активные приборы не становятся целью управления.`);
      return true;
    }
    const elapsed = this.state.tick - (blackout.phaseStartedTick ?? this.state.tick);
    if (blackout.phase === "grid_warning" && elapsed >= 3) {
      blackout.phase = "failover";
      blackout.phaseStartedTick = this.state.tick;
      this.state.options = [];
      this.append("event", "Failover: сеть недоступна", "Карта остаётся ориентированной, но активные линии погасли. Резерв показывает пять отдельных импульсов.");
      return true;
    }
    if (blackout.phase === "failover" && elapsed >= 1) {
      blackout.phase = "reserve_triage";
      blackout.phaseStartedTick = this.state.tick;
      this.append("event", "Reserve Triage", "Сначала один фокусный сенсор и один пассивный маршрут. Резерв не заменяет сеть.");
      return true;
    }
    if (blackout.phase === "reserve_triage" && elapsed >= 6) {
      blackout.phase = "dark_baseline";
      blackout.phaseStartedTick = this.state.tick;
      this.append("archive", "Dark Baseline", "Дом сохраняет surface, boundary и ритмы без активной мощности. Остаётся до трёх осмысленных reserve действий.");
      return true;
    }
    if (blackout.phase === "dark_baseline" && elapsed >= 10) {
      blackout.phase = "grid_return";
      blackout.returnStep = "listen";
      blackout.phaseStartedTick = this.state.tick;
      this.append("event", "Grid Return: Listen", RETURN_STEPS[0].copy);
      return true;
    }
    if (blackout.phase === "grid_return" && elapsed >= 3) {
      const current = blackout.returnStep ?? "listen";
      const nextIndex = RETURN_STEPS.findIndex((entry) => entry.id === current) + 1;
      const next = RETURN_STEPS[nextIndex];
      if (next) {
        blackout.returnStep = next.id;
        blackout.phaseStartedTick = this.state.tick;
        this.append("event", `Grid Return: ${next.title}`, next.copy);
      } else {
        blackout.phase = "afterglow";
        blackout.phaseStartedTick = this.state.tick;
        this.append("archive", "Afterglow: порядок сохранён", "Возврат идёт по очереди, а не одной кнопкой. Archive сохраняет blackout trace без оценки жильцов.");
      }
      return true;
    }
    if (blackout.phase === "afterglow" && elapsed >= 4) {
      this.recordStewardship("blackout.passive-first", "Пассивный порядок", "Резерв был потрачен на наблюдение или маршрут, а не на обещание идеального исхода.");
      this.state.blackout = { ...newBlackout(), reserveCells: blackout.reserveCells };
      this.state.metrics.reserve = blackout.reserveCells / 5;
      this.state.phase = "aftermath";
      this.phaseTicks = 0;
      return false;
    }
    return true;
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
    if (this.state.blackout.phase !== "inactive") {
      const protectedBuffer = this.state.blackout.passivePreparation ? .003 : 0;
      this.state.metrics.network = clamp(this.state.metrics.network - .035);
      this.state.metrics.surface = clamp(this.state.metrics.surface - (.008 - protectedBuffer));
      this.state.metrics.air = clamp(this.state.metrics.air - .004);
      this.state.metrics.wear = clamp(this.state.metrics.wear + .004);
      this.state.metrics.reserve = this.state.blackout.reserveCells / 5;
      return;
    }
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

  private persist() {
    if (!this.persistenceEnabled) return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.state)); } catch { /* Local-first save is optional in restrictive contexts. */ }
  }

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
