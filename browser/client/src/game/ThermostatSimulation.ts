// Design: Тихая технография — only this fixed-tick model mutates routes, configuration and material service tasks; presentation cannot bypass it.
import { DEFAULT_CONFIGURATION, findConfiguration, previewConfiguration } from "./ConfigurationCatalog";
import { ACHIEVEMENT_CATALOG, EMPTY_ACHIEVEMENTS, isAchievementTriggered } from "./AchievementCatalog";
import { createServiceTask } from "./ServiceCatalog";
import type { ConfigurationChannel, ConfigurationPreview, EventPhase, GameState, JournalEntry, RouteKind, RouteOption } from "./types";

const SAVE_KEY = "one-day-thermostat.phaser.save.v1";
const TICK_MS = 200;
const SERVICE_REASON_BY_CHAIN = ["cost.branch_26_resonance", "cost.kitchen_queue", "cost.second_network_peak"] as const;

type ChainDefinition = { title: string; trace: string; caption: string; careful: RouteOption; direct: RouteOption; archive: string; carefulResult: string; directResult: string; };
const CHAINS: ChainDefinition[] = [
  { title: "Порог Аркадия", trace: "Внешний воздух удерживается у входного порога.", caption: "Холод входит от порога. Сначала виден след, затем — маршрут.", careful: { id: "careful", title: "Средний маршрут", label: "Тише для ветви", benefit: "сохранить тихое окно", cost: "порог восстановится медленнее", keyHint: "Q" }, direct: { id: "direct", title: "Прямой маршрут", label: "Быстрее у порога", benefit: "быстрее согреть порог", cost: "ветвь 26 будет слышна дольше", keyHint: "E" }, archive: "Порог", carefulResult: "Средний путь оставил ветви время на восстановление.", directResult: "Быстрый импульс оставил у ветви 26 видимый след обслуживания." },
  { title: "Серебряный коридор", trace: "Влага держится в кухонном контуре дольше, чем успокаивается воздух.", caption: "Серебряный штрих у дренажа отмечает лишний ритм.", careful: { id: "careful", title: "Тихий дренаж", label: "Разделить контур", benefit: "дать влаге отдельный путь", cost: "маршрут займёт больше времени", keyHint: "Q" }, direct: { id: "direct", title: "Прямой обмен", label: "Сменить воздух", benefit: "быстрее поменять воздух", cost: "сеть соберёт очередь", keyHint: "E" }, archive: "Серебряный коридор", carefulResult: "Дренаж получил тихое окно и не собрал лишнюю очередь.", directResult: "Ускоренный обмен оставил сеть в очереди: это service trace, не поражение." },
  { title: "Ночной возврат", trace: "Западная стена хранит дневное тепло, а сеть несёт накопленный ритм.", caption: "Пара следов видна до решения: поверхность и сеть говорят разными языками.", careful: { id: "careful", title: "Поэтапный возврат", label: "Собрать baseline", benefit: "вернуть контур по шагам", cost: "отклик будет спокойнее и дольше", keyHint: "Q" }, direct: { id: "direct", title: "Резкий возврат", label: "Снять пик", benefit: "быстрее снять текущий пик", cost: "сеть получит второй пик", keyHint: "E" }, archive: "Поэтапный возврат", carefulResult: "Дом вернулся к восстанавливаемому ночному baseline.", directResult: "Второй пик стал заметным service trace; день всё равно продолжается." }
];

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const newConfiguration = () => ({ ...DEFAULT_CONFIGURATION, log: [] });
const newService = () => ({ tasks: [], unresolvedReasons: [], credits: 0, review: { available: false } });
const newAchievements = () => ({ ...EMPTY_ACHIEVEMENTS, unlocked: [], pendingPlatformTags: [] });

export class ThermostatSimulation {
  private state: GameState;
  private accumulator = 0;
  private phaseTicks = 0;
  constructor() { this.state = this.createInitial(); this.restore(); }

  public start() { if (this.state.started) return; this.state.started = true; this.append("trace", "Начало наблюдения", "Дом не требует подчинения жильцов. Здесь можно собрать только материальный маршрут."); this.persist(); }

  public chooseRoute(route: RouteKind) {
    if (!this.state.started || this.state.phase !== "warning" || this.state.dayComplete) return;
    const chain = CHAINS[this.state.chainIndex];
    const option = route === "careful" ? chain.careful : chain.direct;
    this.state.phase = "active"; this.state.options = []; this.phaseTicks = 0;
    const modifier = this.state.configuration.routeModifierId;
    const adjustedCost = route === "direct" && modifier === "modifier.soft_open" ? "порог восстановится медленнее; импульс ветви ограничен" : option.cost;
    this.append("route", option.title, `${option.benefit}; цена: ${adjustedCost}.`);
    if (route === "direct") {
      this.state.unresolved.push(modifier === "modifier.direct_boost" ? "ветвь 26 получила усиленный резонанс" : adjustedCost);
      const reason = SERVICE_REASON_BY_CHAIN[this.state.chainIndex];
      if (!this.state.service.unresolvedReasons.includes(reason)) this.state.service.unresolvedReasons.push(reason);
      this.state.metrics.branch = clamp(this.state.metrics.branch + (modifier === "modifier.direct_boost" ? .12 : modifier === "modifier.soft_open" ? .025 : .07));
    }
    this.persist();
  }

  public previewConfiguration(id: string, channel: ConfigurationChannel): ConfigurationPreview { return previewConfiguration(this.state.configuration, id, channel, this.state.tick); }
  public queueConfiguration(preview: ConfigurationPreview) { if (preview.status !== "valid" || preview.staleAtTick !== this.state.tick + 1 || !findConfiguration(preview.selectionId, preview.channel)) return false; this.state.configuration.pending = { ...preview }; this.persist(); return true; }
  public queueServiceRecovery(taskId: string) {
    const task = this.state.service.tasks.find((entry) => entry.id === taskId && !entry.resolved);
    if (!task || this.state.service.pendingTaskId) return false;
    this.state.service.pendingTaskId = taskId; this.persist(); return true;
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
  public reset() { this.state = this.createInitial(); this.accumulator = 0; this.phaseTicks = 0; this.persist(); }

  private createInitial(): GameState {
    const chain = CHAINS[0];
    return { started: false, phase: "prologue", chainIndex: 0, tick: 0, chainTitle: chain.title, trace: chain.trace, caption: chain.caption, options: [], archive: [], unresolved: [], configuration: newConfiguration(), service: newService(), achievements: newAchievements(), metrics: { air: .34, moisture: .3, surface: .48, branch: .36 }, dayComplete: false };
  }

  private step() {
    this.state.tick += 1; this.phaseTicks += 1;
    this.commitPendingConfiguration(); this.commitPendingService(); this.materializeServiceTasks(); this.updateMetrics();
    if (this.state.phase === "prologue" && this.phaseTicks >= 7) {
      this.state.phase = "warning"; this.state.options = [CHAINS[this.state.chainIndex].careful, CHAINS[this.state.chainIndex].direct]; this.phaseTicks = 0;
      this.append("trace", "Два маршрута видны", "Выбери путь по его последствиям. Оба продолжают день; ни один не оценивает людей.");
    } else if (this.state.phase === "active" && this.phaseTicks >= 6) {
      this.state.phase = "aftermath"; this.phaseTicks = 0;
      const latestRoute = this.state.archive.filter((entry) => entry.tone === "route").at(-1)?.title;
      const chain = CHAINS[this.state.chainIndex];
      this.append("archive", chain.archive, latestRoute === chain.careful.title ? chain.carefulResult : chain.directResult);
    } else if (this.state.phase === "aftermath" && this.phaseTicks >= 8) this.advanceChain();
    this.offerEndOfDayReview(); this.progressAchievements(); this.persist();
  }

  private advanceChain() {
    if (this.state.chainIndex >= CHAINS.length - 1) {
      this.state.phase = "complete"; this.state.dayComplete = true; this.state.chainTitle = "Ночной baseline собран";
      this.state.trace = "У дома есть следующий день: следы сохранены, а видимые service tasks можно завершить позднее.";
      this.state.caption = "День не заканчивается победой над кем-то. Он заканчивается новым, восстанавливаемым baseline.";
      this.append("archive", "День собран", "Archive сохранил маршрут, последствия и возможность вернуться к материальным задачам."); return;
    }
    this.state.chainIndex += 1; const chain = CHAINS[this.state.chainIndex];
    this.state.phase = "prologue"; this.state.chainTitle = chain.title; this.state.trace = chain.trace; this.state.caption = chain.caption; this.state.options = []; this.phaseTicks = 0;
    this.append("trace", chain.title, "Новая цепочка начинается с двух наблюдаемых предвестников.");
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
  }

  private commitPendingConfiguration() {
    const pending = this.state.configuration.pending; if (!pending) return; delete this.state.configuration.pending;
    if (pending.staleAtTick !== this.state.tick || pending.status !== "valid" || !findConfiguration(pending.selectionId, pending.channel)) return;
    if (pending.channel === "firmware") this.state.configuration.firmwareId = pending.selectionId;
    if (pending.channel === "sensor") this.state.configuration.sensorModifierId = pending.selectionId;
    if (pending.channel === "route") this.state.configuration.routeModifierId = pending.selectionId;
    this.state.configuration.log.push({ tick: this.state.tick, id: pending.selectionId, title: pending.title });
    this.append("configuration", pending.title, `${pending.effect}; цена: ${pending.tradeoff}.`);
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
    const taskId = this.state.service.pendingTaskId; if (!taskId) return; delete this.state.service.pendingTaskId;
    const task = this.state.service.tasks.find((entry) => entry.id === taskId && !entry.resolved); if (!task) return;
    task.resolved = true; task.completedTick = this.state.tick; this.state.service.credits += 1;
    if (task.componentId === "component.branch_26") this.state.metrics.branch = clamp(this.state.metrics.branch - .12);
    if (task.componentId === "component.kitchen_drain") this.state.metrics.moisture = clamp(this.state.metrics.moisture - .12);
    if (task.componentId === "component.network_main") this.state.metrics.air = clamp(this.state.metrics.air - .1);
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

  private append(tone: JournalEntry["tone"], title: string, body: string) { this.state.archive.push({ tick: this.state.tick, tone, title, body }); }
  private persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.state)); } catch { /* Local-first save is optional in restrictive contexts. */ } }
  private restore() {
    try {
      const raw = localStorage.getItem(SAVE_KEY); if (!raw) return;
      const restored = JSON.parse(raw) as GameState;
      if (typeof restored.tick !== "number" || typeof restored.chainIndex !== "number" || !Array.isArray(restored.archive)) return;
      const legacyConfiguration = restored.configuration ?? newConfiguration(); const legacyService = restored.service ?? newService(); const legacyAchievements = restored.achievements ?? newAchievements();
      this.state = { ...restored, configuration: { ...newConfiguration(), ...legacyConfiguration, log: Array.isArray(legacyConfiguration.log) ? legacyConfiguration.log : [] }, service: { ...newService(), ...legacyService, tasks: Array.isArray(legacyService.tasks) ? legacyService.tasks : [], unresolvedReasons: Array.isArray(legacyService.unresolvedReasons) ? legacyService.unresolvedReasons : [], review: legacyService.review ?? { available: false } }, achievements: { ...newAchievements(), ...legacyAchievements, unlocked: Array.isArray(legacyAchievements.unlocked) ? legacyAchievements.unlocked : [], pendingPlatformTags: Array.isArray(legacyAchievements.pendingPlatformTags) ? legacyAchievements.pendingPlatformTags : [] } };
    } catch { /* Corrupt local data safely falls back to a new day. */ }
  }
}
