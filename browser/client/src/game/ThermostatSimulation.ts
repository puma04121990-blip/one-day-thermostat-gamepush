// Design: Тихая технография — simulation является fixed-tick источником истины; UI только читает snapshot и отправляет route intent.
import type { EventPhase, GameState, JournalEntry, RouteKind, RouteOption } from "./types";

const SAVE_KEY = "one-day-thermostat.phaser.save.v1";
const TICK_MS = 200;

type ChainDefinition = {
  title: string;
  trace: string;
  caption: string;
  careful: RouteOption;
  direct: RouteOption;
  archive: string;
  carefulResult: string;
  directResult: string;
};

const CHAINS: ChainDefinition[] = [
  {
    title: "Порог Аркадия",
    trace: "Внешний воздух удерживается у входного порога.",
    caption: "Холод входит от порога. Сначала виден след, затем — маршрут.",
    careful: { id: "careful", title: "Средний маршрут", label: "Тише для ветви", benefit: "сохранить тихое окно", cost: "порог восстановится медленнее", keyHint: "Q" },
    direct: { id: "direct", title: "Прямой маршрут", label: "Быстрее у порога", benefit: "быстрее согреть порог", cost: "ветвь 26 будет слышна дольше", keyHint: "E" },
    archive: "Порог",
    carefulResult: "Средний путь оставил ветви время на восстановление.",
    directResult: "Быстрый импульс оставил у ветви 26 видимый след обслуживания."
  },
  {
    title: "Серебряный коридор",
    trace: "Влага держится в кухонном контуре дольше, чем успокаивается воздух.",
    caption: "Серебряный штрих у дренажа отмечает лишний ритм.",
    careful: { id: "careful", title: "Тихий дренаж", label: "Разделить контур", benefit: "дать влаге отдельный путь", cost: "маршрут займёт больше времени", keyHint: "Q" },
    direct: { id: "direct", title: "Прямой обмен", label: "Сменить воздух", benefit: "быстрее поменять воздух", cost: "сеть соберёт очередь", keyHint: "E" },
    archive: "Серебряный коридор",
    carefulResult: "Дренаж получил тихое окно и не собрал лишнюю очередь.",
    directResult: "Ускоренный обмен оставил сеть в очереди: это service trace, не поражение."
  },
  {
    title: "Ночной возврат",
    trace: "Западная стена хранит дневное тепло, а сеть несёт накопленный ритм.",
    caption: "Пара следов видна до решения: поверхность и сеть говорят разными языками.",
    careful: { id: "careful", title: "Поэтапный возврат", label: "Собрать baseline", benefit: "вернуть контур по шагам", cost: "отклик будет спокойнее и дольше", keyHint: "Q" },
    direct: { id: "direct", title: "Резкий возврат", label: "Снять пик", benefit: "быстрее снять текущий пик", cost: "сеть получит второй пик", keyHint: "E" },
    archive: "Поэтапный возврат",
    carefulResult: "Дом вернулся к восстанавливаемому ночному baseline.",
    directResult: "Второй пик стал заметным service trace; день всё равно продолжается."
  }
];

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export class ThermostatSimulation {
  private state: GameState;
  private accumulator = 0;
  private phaseTicks = 0;

  constructor() {
    this.state = this.createInitial();
    this.restore();
  }

  public start() {
    if (this.state.started) return;
    this.state.started = true;
    this.append("trace", "Начало наблюдения", "Дом не требует подчинения жильцов. Здесь можно собрать только материальный маршрут.");
    this.persist();
  }

  public chooseRoute(route: RouteKind) {
    if (!this.state.started || this.state.phase !== "warning" || this.state.dayComplete) return;
    const chain = CHAINS[this.state.chainIndex];
    const option = route === "careful" ? chain.careful : chain.direct;
    this.state.phase = "active";
    this.state.options = [];
    this.phaseTicks = 0;
    this.append("route", option.title, `${option.benefit}; цена: ${option.cost}.`);
    if (route === "direct") this.state.unresolved.push(chain.direct.cost);
    this.persist();
  }

  public advance(deltaMs: number) {
    if (!this.state.started || this.state.dayComplete) return;
    this.accumulator += Math.min(250, Math.max(0, deltaMs));
    while (this.accumulator >= TICK_MS) {
      this.accumulator -= TICK_MS;
      this.step();
    }
  }

  public snapshot(): GameState {
    return JSON.parse(JSON.stringify(this.state)) as GameState;
  }

  public reset() {
    this.state = this.createInitial();
    this.accumulator = 0;
    this.phaseTicks = 0;
    this.persist();
  }

  private createInitial(): GameState {
    const chain = CHAINS[0];
    return {
      started: false,
      phase: "prologue",
      chainIndex: 0,
      tick: 0,
      chainTitle: chain.title,
      trace: chain.trace,
      caption: chain.caption,
      options: [],
      archive: [],
      unresolved: [],
      metrics: { air: 0.34, moisture: 0.3, surface: 0.48, branch: 0.36 },
      dayComplete: false
    };
  }

  private step() {
    this.state.tick += 1;
    this.phaseTicks += 1;
    this.updateMetrics();

    if (this.state.phase === "prologue" && this.phaseTicks >= 7) {
      this.state.phase = "warning";
      this.state.options = [CHAINS[this.state.chainIndex].careful, CHAINS[this.state.chainIndex].direct];
      this.phaseTicks = 0;
      this.append("trace", "Два маршрута видны", "Выбери путь по его последствиям. Оба продолжают день; ни один не оценивает людей.");
    } else if (this.state.phase === "active" && this.phaseTicks >= 6) {
      this.state.phase = "aftermath";
      this.phaseTicks = 0;
      const latestRoute = this.state.archive.filter((entry) => entry.tone === "route").at(-1)?.title;
      const careful = latestRoute === CHAINS[this.state.chainIndex].careful.title;
      const chain = CHAINS[this.state.chainIndex];
      this.append("archive", chain.archive, careful ? chain.carefulResult : chain.directResult);
    } else if (this.state.phase === "aftermath" && this.phaseTicks >= 8) {
      this.advanceChain();
    }
    this.persist();
  }

  private advanceChain() {
    if (this.state.chainIndex >= CHAINS.length - 1) {
      this.state.phase = "complete";
      this.state.dayComplete = true;
      this.state.chainTitle = "Ночной baseline собран";
      this.state.trace = "У дома есть следующий день: следы сохранены, а видимые service tasks можно завершить позднее.";
      this.state.caption = "День не заканчивается победой над кем-то. Он заканчивается новым, восстанавливаемым baseline.";
      this.append("archive", "День собран", "Archive сохранил маршрут, последствия и возможность вернуться к материальным задачам.");
      return;
    }
    this.state.chainIndex += 1;
    const chain = CHAINS[this.state.chainIndex];
    this.state.phase = "prologue";
    this.state.chainTitle = chain.title;
    this.state.trace = chain.trace;
    this.state.caption = chain.caption;
    this.state.options = [];
    this.phaseTicks = 0;
    this.append("trace", chain.title, "Новая цепочка начинается с двух наблюдаемых предвестников.");
  }

  private updateMetrics() {
    const phaseModifier: Record<EventPhase, number> = { prologue: 0.015, warning: 0.02, active: -0.018, aftermath: -0.01, complete: -0.004 };
    const direction = phaseModifier[this.state.phase];
    this.state.metrics.air = clamp(this.state.metrics.air + direction * (this.state.chainIndex === 0 ? 1 : -0.3));
    this.state.metrics.moisture = clamp(this.state.metrics.moisture + direction * (this.state.chainIndex === 1 ? 1.4 : -0.2));
    this.state.metrics.surface = clamp(this.state.metrics.surface + direction * (this.state.chainIndex === 2 ? 1.1 : 0.15));
    this.state.metrics.branch = clamp(this.state.metrics.branch + direction * (this.state.chainIndex === 0 ? 0.8 : 0.25));
  }

  private append(tone: JournalEntry["tone"], title: string, body: string) {
    this.state.archive.push({ tick: this.state.tick, tone, title, body });
  }

  private persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.state)); } catch { /* Local-first save remains optional in restrictive browser contexts. */ }
  }

  private restore() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const restored = JSON.parse(raw) as GameState;
      if (typeof restored.tick === "number" && typeof restored.chainIndex === "number" && Array.isArray(restored.archive)) this.state = restored;
    } catch { /* Corrupt local data safely falls back to a new day. */ }
  }
}
