// Design: Тихая технография — лента наблюдений слева, материальный cutaway справа, честные маршруты у нижнего края.
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Archive, AudioLines, ChevronDown, CircleHelp, Gauge, Moon, RotateCcw, ScanSearch, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Trophy, Type, Wrench, X } from "lucide-react";
import { achievementDefinition } from "@/game/AchievementCatalog";
import { BLACKOUT_ACTIONS, RESERVE_FOCUS_SENSORS } from "@/game/BlackoutCatalog";
import { EngineLoadingProgress } from "@/components/EngineLoadingProgress";
import { entriesFor } from "@/game/ConfigurationCatalog";
import { POLICY_CATALOG } from "@/game/PolicyCatalog";
import { SENSOR_LAYERS } from "@/game/ScenarioCatalog";
import { serviceTraceKey } from "@/game/ServiceCatalog";
import { ThermostatSimulation } from "@/game/ThermostatSimulation";
import type { ConfigurationChannel, ConfigurationPreview, FeedbackTopic, GameState, HandsOnAction, PolicyPreview, ReserveActionId, ReserveFocusSensor, RouteKind, SensorLayer } from "@/game/types";

const LOGO = "/manus-storage/thermostat-route-mark_4292ba1f.png";
const JOURNAL = "/manus-storage/thermostat-journal-backdrop_cb648cce.png";
const ATLAS = "/manus-storage/thermostat-sensor-atlas_4ee06309.png";
const PhaserThermostat = lazy(() => import("@/components/PhaserThermostat").then((module) => ({ default: module.PhaserThermostat })));

const settingsKey = "one-day-thermostat.phaser.profile.v1";
type Profile = { reducedMotion: boolean; lowSensory: boolean; textScale: number };
type EngineStatus = "idle" | "loading" | "booting" | "ready";

function loadProfile(): Profile {
  try {
    const stored = JSON.parse(localStorage.getItem(settingsKey) ?? "{}") as Partial<Profile>;
    return { reducedMotion: Boolean(stored.reducedMotion), lowSensory: Boolean(stored.lowSensory), textScale: Math.min(1.25, Math.max(0.9, Number(stored.textScale) || 1)) };
  } catch { return { reducedMotion: false, lowSensory: false, textScale: 1 }; }
}

const meters = [
  { key: "air", name: "ВОЗДУХ", pattern: "— — —" },
  { key: "moisture", name: "ВЛАГА", pattern: "···" },
  { key: "surface", name: "ПОВЕРХНОСТЬ", pattern: "▱▱" },
  { key: "branch", name: "ВЕТВЬ 26", pattern: "| |" }
] as const;

const configurationSections: Array<{ channel: ConfigurationChannel; label: string; note: string }> = [
  { channel: "firmware", label: "FIRMWARE", note: "Что выходит на первый план в наблюдении." },
  { channel: "sensor", label: "SENSOR MODIFIER", note: "Как материальный след получает форму и узор." },
  { channel: "route", label: "ROUTE MODIFIER", note: "Как ограничивается или усиливается только прямой маршрут." }
];

export default function Home() {
  const simulation = useMemo(() => {
    const demo = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("demo") : null;
    const instance = new ThermostatSimulation(demo ? { restore: false } : undefined);
    if (demo === "blackout") instance.prepareBlackoutDemo();
    if (demo === "hands") instance.start();
    if (demo === "hands3") { instance.start(); instance.performHandsOn("touch_frame"); instance.performHandsOn("hold_route"); instance.performHandsOn("touch_wall"); }
    return instance;
  }, []);
  const [state, setState] = useState<GameState>(() => simulation.snapshot());
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const [journalOpen, setJournalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [configurationOpen, setConfigurationOpen] = useState(false);
  const [configurationPreview, setConfigurationPreview] = useState<ConfigurationPreview | null>(null);
  const [policyPreview, setPolicyPreview] = useState<PolicyPreview | null>(null);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [sensorOpen, setSensorOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [engineStatus, setEngineStatus] = useState<EngineStatus>(() => simulation.snapshot().started ? "loading" : "idle");
  const [reserveFocus, setReserveFocus] = useState<ReserveFocusSensor>("surface");
  const [replayStatus, setReplayStatus] = useState<"idle" | "verified" | "mismatch">("idle");
  const [holdingRoute, setHoldingRoute] = useState(false);
  const holdTimer = useRef<number | undefined>(undefined);

  const receiveState = useCallback((next: GameState) => setState(next), []);
  const refresh = useCallback(() => setState(simulation.snapshot()), [simulation]);
  const handleEngineBoot = useCallback(() => setEngineStatus("booting"), []);
  const handleEngineReady = useCallback(() => setEngineStatus("ready"), []);

  useEffect(() => {
    try { localStorage.setItem(settingsKey, JSON.stringify(profile)); } catch { /* Preference saving is opportunistic. */ }
  }, [profile]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "q") { simulation.chooseRoute("careful"); refresh(); }
      if (event.key.toLowerCase() === "e") { simulation.chooseRoute("direct"); refresh(); }
      if (event.key.toLowerCase() === "j" && state.handsOn.step === 3) setJournalOpen((value) => !value);
      if (event.key.toLowerCase() === "a") setJournalOpen(true);
      if (event.key.toLowerCase() === "m") setProfile((value) => ({ ...value, reducedMotion: !value.reducedMotion }));
      if (event.key.toLowerCase() === "l") setProfile((value) => ({ ...value, lowSensory: !value.lowSensory }));
      if (event.key.toLowerCase() === "c" && state.handsOn.step === 3) setConfigurationOpen((value) => !value);
      if (event.key.toLowerCase() === "v" && state.handsOn.step === 3) setServiceOpen((value) => !value);
      if (event.key.toLowerCase() === "s" && state.handsOn.step === 3) setSensorOpen((value) => !value);
      if (event.key === "Escape") { setJournalOpen(false); setSettingsOpen(false); setConfigurationOpen(false); setServiceOpen(false); setSensorOpen(false); setHelpOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [refresh, simulation, state.handsOn.step]);

  const begin = () => { setEngineStatus("loading"); simulation.start(); refresh(); };
  const choose = (route: RouteKind) => { simulation.chooseRoute(route); refresh(); };
  const performHandsOn = (action: HandsOnAction) => { if (simulation.performHandsOn(action)) refresh(); };
  const beginHoldRoute = () => {
    if (state.handsOn.step !== 1 || holdTimer.current !== undefined) return;
    setHoldingRoute(true);
    holdTimer.current = window.setTimeout(() => { performHandsOn("hold_route"); setHoldingRoute(false); holdTimer.current = undefined; }, 600);
  };
  const cancelHoldRoute = () => {
    if (holdTimer.current !== undefined) window.clearTimeout(holdTimer.current);
    holdTimer.current = undefined;
    setHoldingRoute(false);
  };
  const restart = () => { simulation.reset(); setEngineStatus("idle"); refresh(); setJournalOpen(false); };
  const inspectConfiguration = (id: string, channel: ConfigurationChannel) => setConfigurationPreview(simulation.previewConfiguration(id, channel));
  const commitConfiguration = () => {
    if (!configurationPreview) return;
    if (simulation.queueConfiguration(configurationPreview)) refresh();
  };
  const selectSensor = (layer: SensorLayer) => { if (simulation.selectSensor(layer)) refresh(); };
  const inspectPolicy = (id: string) => setPolicyPreview(simulation.previewPolicy(id));
  const commitPolicy = () => { if (policyPreview && simulation.queuePolicy(policyPreview)) refresh(); };
  const recoverService = (taskId: string) => { if (simulation.queueServiceRecovery(taskId)) refresh(); };
  const markFeedback = (topic: FeedbackTopic, understanding: "clear" | "unclear") => { if (simulation.recordFeedback(topic, understanding)) refresh(); };
  const exportFeedback = () => {
    const blob = new Blob([simulation.exportFeedback()], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = "thermal-trace-local-feedback.json";
    link.click();
    URL.revokeObjectURL(href);
  };
  const useReserve = (action: ReserveActionId) => { if (simulation.useReserve(action, action === "focus_sense" ? reserveFocus : undefined)) refresh(); };
  const exportReplay = () => {
    const blob = new Blob([simulation.exportReplay()], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = "one-day-thermostat-replay.json";
    link.click();
    URL.revokeObjectURL(href);
  };
  const verifyReplay = () => setReplayStatus(simulation.replayDeterministically() ? "verified" : "mismatch");
  const openServiceTasks = state.service.tasks.filter((task) => !task.resolved);
  const handsOnReady = state.handsOn.step === 3;

  return (
    <main className={`thermostat-shell ${profile.lowSensory ? "low-sensory" : ""} ${profile.reducedMotion ? "reduce-motion" : ""}`} style={{ fontSize: `${profile.textScale}em` }}>
      <section className="game-stage" aria-label="Срез дома и материальные маршруты">
        {state.started && engineStatus !== "ready" && <EngineLoadingProgress status={engineStatus} reducedMotion={profile.reducedMotion} />}
        {state.started && <Suspense fallback={<div className="canvas-loading" aria-hidden="true" />}><PhaserThermostat simulation={simulation} onState={receiveState} reducedMotion={profile.reducedMotion} onBoot={handleEngineBoot} onReady={handleEngineReady} /></Suspense>}
        <div className="grain" />
        <div className="copper-route-map" aria-hidden="true"><span className="route-node node-a" /><span className="route-node node-b" /><span className="route-node node-c" /><span className="route-tag">МАРШРУТ / 03</span></div>
        <div className="house-field" aria-hidden="true"><span className="house-field-label">ДОМ / МАТЕРИАЛЬНЫЙ СРЕЗ</span><span className="house-room room-entry"><i>ПОРОГ</i><em>→→</em></span><span className="house-room room-kitchen"><i>КУХНЯ</i><em>···</em></span><span className="house-room room-quiet"><i>ТИХОЕ ОКНО</i><em>| |</em></span><span className="house-room room-core"><i>ВЕТВЬ 26</i><em>▱▱</em></span><span className="house-route route-one" /><span className="house-route route-two" /><span className="house-node house-node-a" /><span className="house-node house-node-b" /><span className="house-node house-node-c" /></div>

        <header className="top-bar">
          <button className="brand-lockup" onClick={() => setHelpOpen(true)} aria-label="О проекте и управлении">
            <img src={LOGO} alt="" />
            <span><b>ОДИН ДЕНЬ</b><em>ТЕРМОСТАТА</em></span>
          </button>
          <div className="top-actions">
            {handsOnReady && <button className="icon-button" onClick={() => setJournalOpen(true)} aria-label="Открыть журнал"><Archive size={18} /><span>J</span></button>}
            {handsOnReady && <button className="icon-button" onClick={() => setConfigurationOpen(true)} aria-label="Открыть настройки маршрутов"><SlidersHorizontal size={18} /><span>C</span></button>}
            {handsOnReady && <button className="icon-button" onClick={() => setServiceOpen(true)} aria-label="Открыть задачи дома"><Wrench size={17} /><span>V</span></button>}
            <button className="icon-button" onClick={() => setSettingsOpen(true)} aria-label="Открыть настройки доступности"><Settings2 size={18} /></button>
          </div>
        </header>

        <aside className="observation-rail">
          <div className="tick-stamp"><span>ТИК</span><b>{String(state.tick).padStart(3, "0")}</b></div>
          <div className="phase-pill"><span className={`phase-dot phase-${state.phase}`} />{!handsOnReady ? "ПЕРВЫЙ СЛЕД" : state.dayComplete ? "НОВЫЙ BASELINE" : state.phase === "warning" ? "РЕШЕНИЕ ВИДИМО" : "НАБЛЮДЕНИЕ"}</div>
          {!handsOnReady ? <section className="first-goal" aria-live="polite"><p className="eyebrow">ПЕРВАЯ ЗАДАЧА</p><h1>Сохрани<br />тихое окно.</h1><p>{state.handsOn.feedback}</p><div className="goal-progress" aria-label={`Собрано следов: ${state.handsOn.step} из 3`}><span className={state.handsOn.step >= 1 ? "done" : ""} /><span className={state.handsOn.step >= 2 ? "done" : ""} /><span className={state.handsOn.step >= 3 ? "done" : ""} /><b>{state.handsOn.step}/3 СЛЕДА</b></div><small>Нажимай на дом. Никаких меню пока не нужно.</small></section> : <><p className="eyebrow">ЦЕПОЧКА {state.chainIndex + 1} / 3</p><h1>{state.chainTitle}</h1><p className="trace-copy">{state.trace}</p><button className="caption-card diagnostic-trigger" onClick={() => setSensorOpen(true)} aria-label="Открыть сенсоры и диагностику"><AudioLines size={17} /><p>{state.caption}</p><ScanSearch size={15} /></button>{state.tutorial.current !== "complete" && <section className="tutorial-rail" aria-live="polite"><p className="eyebrow">ОБУЧЕНИЕ / БЕЗ ПАУЗЫ</p><b>{state.tutorial.current === "observe_heat" ? "Прочитай тепловой след" : state.tutorial.current === "read_vibration" ? "Сверь вибрацию" : state.tutorial.current === "compare_routes" ? "Сравни цену маршрутов" : "Посмотри на новый baseline"}</b><small>Подсказка не отменяет выбор и не создаёт fail-state.</small></section>}<div className="sensor-stack" aria-label="Материальные датчики">{meters.map((meter) => { const value = Math.round(state.metrics[meter.key] * 100); return <div className="sensor-row" key={meter.key}><span className="sensor-pattern">{meter.pattern}</span><span>{meter.name}</span><b>{value}</b></div>; })}</div><button className="achievement-strip" onClick={() => setJournalOpen(true)} aria-label="Открыть достижения в Archive"><Trophy size={16} /><span><b>{state.achievements.unlocked.length} LOCAL TRACE</b><small>{state.achievements.pendingPlatformTags.length ? `${state.achievements.pendingPlatformTags.length} ждут platform mirror` : "A · открыть Archive"}</small></span></button></>}
        </aside>

        <div className="canvas-caption"><Gauge size={15} /> <span>МАРШРУТЫ — МАТЕРИАЛЬНЫЕ; ЖИЛЬЦЫ НЕ ЯВЛЯЮТСЯ ЦЕЛЬЮ УПРАВЛЕНИЯ</span></div>

        {!state.started && <div className="onboarding" role="dialog" aria-modal="true" aria-label="Начать день">
          <div className="onboarding-mark"><img src={LOGO} alt="" /></div>
          <div className="onboarding-rule" />
          <p className="eyebrow">ОДНА КОМНАТА · ОДИН ХОЛОДНЫЙ СЛЕД</p>
          <h2>В кухню<br />тянет холодом.</h2>
          <p>Сначала просто найди раму, удержи маршрут и проверь тёплую стену.</p>
          <button className="primary-cta" onClick={begin}><span>ПОКАЗАТЬ СЛЕД</span><ChevronDown size={18} /></button>
          <small>Три коротких действия — затем появится настоящий выбор.</small>
        </div>}

        {state.started && !handsOnReady && <section className="hands-on-deck" aria-label="Первые действия с домом"><div className="hands-on-heading"><span>ТИХОЕ ОКНО · {state.handsOn.step}/3</span><p>{state.handsOn.step === 0 ? "Нажми на раму — холодный след покажет маршрут." : state.handsOn.step === 1 ? "Удерживай медную связь, пока она не защёлкнется." : "Коснись тёплой стены — затем появится два маршрута."}</p></div><div className="hands-on-actions"><button className={`hands-on-card ${state.handsOn.step === 0 ? "active" : "done"}`} onClick={() => performHandsOn("touch_frame")} disabled={state.handsOn.step !== 0}><span>01</span><b>{state.handsOn.step > 0 ? "РАМА НАЙДЕНА" : "КОСНИСЬ РАМЫ"}</b><small>Холод вошёл здесь.</small></button><button className={`hands-on-card hold-card ${state.handsOn.step === 1 ? "active" : state.handsOn.step > 1 ? "done" : ""} ${holdingRoute ? "holding" : ""}`} onPointerDown={beginHoldRoute} onPointerUp={cancelHoldRoute} onPointerCancel={cancelHoldRoute} onPointerLeave={cancelHoldRoute} onKeyDown={(event) => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); beginHoldRoute(); } }} onKeyUp={cancelHoldRoute} disabled={state.handsOn.step !== 1}><span>02</span><b>{state.handsOn.step > 1 ? "СВЯЗЬ ДЕРЖИТ" : holdingRoute ? "ДЕРЖИ…" : "УДЕРЖИВАЙ СВЯЗЬ"}</b><small>{holdingRoute ? "Ещё мгновение." : "0.6 секунды — без спешки."}</small></button><button className={`hands-on-card ${state.handsOn.step === 2 ? "active" : state.handsOn.step > 2 ? "done" : ""}`} onClick={() => performHandsOn("touch_wall")} disabled={state.handsOn.step !== 2}><span>03</span><b>{state.handsOn.step > 2 ? "ОКНО СОХРАНЕНО" : "КОСНИСЬ СТЕНЫ"}</b><small>Проверь, что тепло осталось.</small></button></div></section>}

        {state.started && handsOnReady && !state.dayComplete && <section className="route-deck" aria-label="Доступные маршруты">
          <div className="route-deck-heading"><span>{state.event.state === "warning" ? "SAFE ISOLATE / BRANCH 26" : "МАРШРУТЫ"}</span><p>{state.event.state === "foreshadow" ? "Два независимых предвестника ветви 26 уже доступны. Сначала собери гипотезу." : state.event.state === "warning" ? "Контур ограничивает риск. Оба маршрута безопасны и оставляют различимую цену." : state.phase === "warning" ? "Две видимые цены. Ни один путь не завершает день преждевременно." : "Сначала дождись, пока дом покажет оба предвестника."}</p></div>
          <div className="route-options">
            {state.options.length > 0 ? state.options.map((option) => <button key={option.id} className={`route-card ${option.id}`} onClick={() => choose(option.id)}>
              <span className="route-key">{option.keyHint}</span><span className="route-label">{option.label}</span><b>{option.title}</b><p><strong>{option.benefit}</strong><em>цена: {option.cost}</em></p>
            </button>) : <div className="waiting-card"><Sparkles size={18} /><p>{state.phase === "active" ? "Маршрут уже работает. След появится в Archive." : "Дом собирает наблюдаемые следы…"}</p></div>}
          </div>
        </section>}

        {state.blackout.phase !== "inactive" && <section className="blackout-hud" aria-live="polite" aria-label="Режим резерва"><div className="blackout-head"><span>RESERVE MODE</span><b>{state.blackout.phase.replace("_", " ").toUpperCase()}</b><small>GRID OFFLINE · активные линии не являются доступными действиями</small></div><div className="reserve-readout"><div className="reserve-cells" role="img" aria-label={`Резерв: ${state.blackout.reserveCells} из 5 ячеек`}><span className={state.blackout.reserveCells >= 1 ? "charged" : "spent"} /><span className={state.blackout.reserveCells >= 2 ? "charged" : "spent"} /><span className={state.blackout.reserveCells >= 3 ? "charged" : "spent"} /><span className={state.blackout.reserveCells >= 4 ? "charged" : "spent"} /><span className={state.blackout.reserveCells >= 5 ? "charged" : "spent"} /></div><p><b>B: {state.blackout.reserveCells} IMPULSES</b><small>Фокус: {state.blackout.focusedSensor?.toUpperCase() ?? "COARSE MAP"}</small></p></div>{(state.blackout.phase === "grid_warning" || state.blackout.phase === "failover") && <p className="blackout-copy">{state.blackout.foreshadows.join(" · ")}. Сначала дом сохраняет пассивные маршруты.</p>}{(state.blackout.phase === "reserve_triage" || state.blackout.phase === "dark_baseline") && <div className="reserve-actions"><label>Фокусный сенсор<select aria-label="Сенсорный фокус на резерве" value={reserveFocus} onChange={(event) => setReserveFocus(event.target.value as ReserveFocusSensor)}>{RESERVE_FOCUS_SENSORS.map((sensor) => <option key={sensor.id} value={sensor.id}>{sensor.label}</option>)}</select></label><div>{(["focus_sense", "lock_route", "pulse_shunt"] as ReserveActionId[]).map((action) => <button key={action} onClick={() => useReserve(action)} disabled={state.blackout.usedActions.includes(action) || state.blackout.reserveCells <= 0}><b>{BLACKOUT_ACTIONS[action].title}</b><small>{BLACKOUT_ACTIONS[action].cost} · {BLACKOUT_ACTIONS[action].effect}</small></button>)}</div><p>Осталось действий: {Math.max(0, 3 - state.blackout.usedActions.length)} из 3. Наблюдение общей карты не тратит резерв.</p></div>}{state.blackout.phase === "grid_return" && <p className="blackout-copy">Возврат сети идёт по шагам: {state.blackout.returnStep?.toUpperCase() ?? "LISTEN"}. Нет команды «включить всё».</p>}</section>}

        {state.dayComplete && <section className="completion-card"><span className="completion-mark">◆</span><p className="eyebrow">ДЕНЬ СОБРАН</p><h2>Восстанавливаемый baseline<br />на завтра уже есть.</h2><p>Следы остались в Archive. Нерешённые материальные задачи можно взять с собой, но игра не наказывает за них.</p><button className="primary-cta" onClick={restart}><RotateCcw size={17} />НАЧАТЬ НОВЫЙ ДЕНЬ</button></section>}
      </section>

      {journalOpen && <aside className="journal-sheet" role="dialog" aria-modal="true" aria-label="Archive журнала" style={{ backgroundImage: `linear-gradient(90deg, rgba(9,18,29,.96), rgba(9,18,29,.76)), url(${JOURNAL})` }}>
        <div className="sheet-top"><div><p className="eyebrow">ARCHIVE / LOCAL</p><h2>Журнал дома</h2></div><button className="icon-button" onClick={() => setJournalOpen(false)} aria-label="Закрыть журнал"><X size={19} /></button></div>
        <p className="journal-intro">Каждая запись описывает материальный след и последствия маршрута. Она не является оценкой жильца.</p>
        <section className="boundary-card" aria-label="Контекст и границы текущей сцены"><p className="eyebrow">КОНТЕКСТ СЦЕНЫ</p><b>{state.boundaries[0]?.materialSignature}</b><p>{state.boundaries[0]?.context}</p><small>Возможная adaptation: {state.boundaries[0]?.adaptation}</small><small>Player scope: {state.boundaries[0]?.playerScope}</small><em>{state.boundaries[0]?.never}</em></section>
        {state.policy.log.length > 0 && <section className="policy-ledger" aria-label="Журнал policy"><p className="eyebrow">POLICY LOG</p>{[...state.policy.log].reverse().map((entry, index) => <p key={`${entry.tick}-${entry.id}-${index}`}><b>{entry.title}</b> · {entry.state} · Т.{String(entry.tick).padStart(3, "0")}</p>)}</section>}
        {state.stewardship.recognitions.length > 0 && <section className="stewardship-ledger" aria-label="Журнал бережности"><p className="eyebrow">ЖУРНАЛ БЕРЕЖНОСТИ</p>{[...state.stewardship.recognitions].reverse().map((entry) => <p key={entry.id}><b>{entry.title}</b> · {entry.reason}</p>)}</section>}
        <section className="achievement-ledger" aria-label="Локальные достижения"><div className="achievement-ledger-head"><Trophy size={18} /><span><p className="eyebrow">LOCAL ACHIEVEMENTS</p><b>Следы, а не power-up</b></span></div>{state.achievements.unlocked.length ? <div className="achievement-list">{state.achievements.unlocked.map((entry) => { const definition = achievementDefinition(entry.id); return <article key={entry.id}><span>◇</span><div><b>{definition?.title ?? entry.id}</b><p>{definition?.description ?? "Локальный trace сохранён."}</p><small>Т.{String(entry.unlockedTick).padStart(3, "0")}</small></div></article>; })}</div> : <p className="empty-note">Первые локальные следы появятся после авторитетных событий дня.</p>}{state.achievements.pendingPlatformTags.length > 0 && <p className="achievement-pending">PENDING MIRROR: {state.achievements.pendingPlatformTags.length}. Теги остаются local-first до подключения реального GamePush browser SDK.</p>}</section>
        <section className="feedback-ledger" aria-label="Локальная обратная связь"><p className="eyebrow">ТЕПЛОВОЙ СЛЕД / LOCAL FEEDBACK</p><p>Без отправки и без персональных данных: отметь, была ли ясна причина, цена или доступный формат.</p>{state.feedback.consent === "undecided" && <div><button onClick={() => { simulation.setFeedbackConsent("accepted"); refresh(); }}>СОГЛАСЕН НА ЛОКАЛЬНЫЕ ОТМЕТКИ</button><button onClick={() => { simulation.setFeedbackConsent("declined"); refresh(); }}>НЕ СОБИРАТЬ</button></div>}{state.feedback.consent === "accepted" && <div><button onClick={() => markFeedback("cause", "clear")}>ПРИЧИНА ЯСНА</button><button onClick={() => markFeedback("cost", "unclear")}>ЦЕНА НЕЯСНА</button><button onClick={() => markFeedback("accessibility", "clear")}>ФОРМАТ ДОСТУПЕН</button><button onClick={exportFeedback}>ЭКСПОРТ JSON</button></div>}{state.feedback.consent === "declined" && <small>Отметки отключены. Это решение можно изменить после перезапуска локального дня.</small>}</section>
        <section className="replay-ledger" aria-label="Детерминированное повторное прохождение"><p className="eyebrow">DETERMINISTIC REPLAY / LOCAL</p><p>Семя сценария и {state.replay.commands.length} принятых authoritative команд можно экспортировать без профиля игрока. Проверка повторяет их в изолированном fixed-tick прогоне.</p><div><button onClick={exportReplay}>ЭКСПОРТ REPLAY JSON</button><button onClick={verifyReplay}>ПРОВЕРИТЬ ПОВТОР</button></div>{replayStatus !== "idle" && <small className={replayStatus}>{replayStatus === "verified" ? "◆ Снимок повторён точно: seed, команды и итоговый state совпали." : "◇ Снимок не совпал: log оставлен локально для диагностики."}</small>}</section>
        <div className="journal-list">{state.archive.length ? [...state.archive].reverse().map((entry, index) => <article key={`${entry.tick}-${index}`} className={`journal-entry ${entry.tone}`}><span>Т.{String(entry.tick).padStart(3, "0")}</span><div><b>{entry.title}</b><p>{entry.body}</p></div></article>) : <p className="empty-note">Начни наблюдение — первые следы появятся здесь.</p>}</div>
        {state.unresolved.length > 0 && <div className="service-note"><b>ВИДИМЫЕ SERVICE TRACE</b>{state.unresolved.map((item, index) => <p key={serviceTraceKey(item, index)}>— {item}</p>)}</div>}
      </aside>}

      {settingsOpen && <aside className="settings-sheet" role="dialog" aria-modal="true" aria-label="Настройки доступности"><div className="sheet-top"><div><p className="eyebrow">ПРОФИЛЬ ИГРОКА</p><h2>Доступность</h2></div><button className="icon-button" onClick={() => setSettingsOpen(false)} aria-label="Закрыть настройки"><X size={19} /></button></div>
        <ToggleRow icon={<Moon size={18} />} title="Low-sensory" description="Убирает несущественные motion и сохраняет все смыслы." active={profile.lowSensory} onClick={() => setProfile((value) => ({ ...value, lowSensory: !value.lowSensory }))} hotkey="L" />
        <ToggleRow icon={<Sparkles size={18} />} title="Reduced motion" description="Маршруты и изменения состояния становятся мгновенными." active={profile.reducedMotion} onClick={() => setProfile((value) => ({ ...value, reducedMotion: !value.reducedMotion }))} hotkey="M" />
        <div className="text-scale"><div><Type size={18} /><span><b>Размер текста</b><small>90–125% · сохраняется локально</small></span></div><input aria-label="Размер текста" type="range" min="0.9" max="1.25" step="0.05" value={profile.textScale} onChange={(event) => setProfile((value) => ({ ...value, textScale: Number(event.target.value) }))} /><b>{Math.round(profile.textScale * 100)}%</b></div>
      </aside>}

      {sensorOpen && <aside className="sensor-sheet" role="dialog" aria-modal="true" aria-label="Сенсоры и диагностика"><div className="sheet-top"><div><p className="eyebrow">L1 SENSOR → L2 DIAGNOSTIC</p><h2>Читать<br />следы</h2></div><button className="icon-button" onClick={() => setSensorOpen(false)} aria-label="Закрыть сенсоры"><X size={19} /></button></div><p className="sensor-intro">Один слой отвечает на один вопрос. Цвет, узор, подпись и canonical copy описывают тот же сигнал.</p><div className="sensor-picker">{SENSOR_LAYERS.map((layer) => <button key={layer.id} className={state.sensorLayer === layer.id ? "active" : ""} aria-pressed={state.sensorLayer === layer.id} onClick={() => selectSensor(layer.id)}><span>{layer.pattern}</span><b>{layer.label}</b><small>{layer.description}</small></button>)}</div><section className={`diagnostic-card status-${state.diagnostic.status}`} aria-live="polite"><p className="eyebrow">{state.diagnostic.status.toUpperCase()} · {state.diagnostic.layer.toUpperCase()}</p><h3>{state.diagnostic.source}</h3><p><b>Изменение:</b> {state.diagnostic.change}</p><p><b>Почему:</b> {state.diagnostic.causes.join(" · ")}</p><p><b>Прогноз:</b> {state.diagnostic.forecast}</p><small>{state.diagnostic.caption}</small></section></aside>}

      {configurationOpen && <aside className="configuration-sheet" role="dialog" aria-modal="true" aria-label="Firmware и modifiers"><div className="sheet-top"><div><p className="eyebrow">БЕЗОПАСНАЯ КОНФИГУРАЦИЯ</p><h2>Контуры<br />наблюдения</h2></div><button className="icon-button" onClick={() => setConfigurationOpen(false)} aria-label="Закрыть конфигурацию"><X size={19} /></button></div>
        <p className="configuration-intro">Сначала посмотри пользу и цену. Выбор попадёт в очередь и применится только на следующем тике; он не меняет людей или скрытые причины.</p>
        {configurationSections.map((section) => <section className="configuration-section" key={section.channel}><div className="configuration-section-head"><b>{section.label}</b><small>{section.note}</small></div><div className="configuration-options">{entriesFor(section.channel).map((entry) => <button key={entry.id} className={`configuration-choice ${configurationPreview?.selectionId === entry.id ? "inspected" : ""}`} onClick={() => inspectConfiguration(entry.id, section.channel)} aria-pressed={configurationPreview?.selectionId === entry.id}><span className="configuration-node">◆</span><span><b>{entry.title}</b><small>{entry.effect}</small><em>цена: {entry.tradeoff}</em></span></button>)}</div></section>)}
        <section className={`configuration-preview ${configurationPreview?.status ?? "empty"}`} aria-live="polite">{configurationPreview ? <><p className="eyebrow">{configurationPreview.status === "valid" ? "PREVIEW · НЕ МЕНЯЕТ ДЕНЬ" : configurationPreview.status === "selected" ? "УЖЕ АКТИВНО" : "ЗАБЛОКИРОВАНО"}</p><b>{configurationPreview.title}</b><p>{configurationPreview.effect}</p><p className="configuration-cost">Цена: {configurationPreview.tradeoff}</p>{configurationPreview.alternative && <p className="configuration-alternative">{configurationPreview.alternative}</p>}{configurationPreview.status === "valid" && <button className="primary-cta" onClick={commitConfiguration}>ПРИМЕНИТЬ НА СЛЕДУЮЩЕМ ТИКЕ</button>}</> : <p>Выбери элемент каталога — preview покажет результат до любого commit.</p>}</section>
        <section className="policy-lab" aria-label="Безопасные policy rules"><div className="configuration-section-head"><span><ShieldCheck size={16} /> POLICY / GOVERNOR</span><small>Rule объясняет trigger, safety context, одно действие, цену и stop condition.</small></div><div className="policy-options">{POLICY_CATALOG.map((policy) => <button key={policy.id} className={policyPreview?.policyId === policy.id ? "inspected" : ""} onClick={() => inspectPolicy(policy.id)}><b>{policy.title}</b><small>WHEN: {policy.when}</small><em>UNTIL: {policy.until}</em></button>)}</div>{policyPreview && <div className={`policy-preview ${policyPreview.status}`}><p className="eyebrow">{policyPreview.status === "valid" ? "PREVIEW · GOVERNOR ПРОВЕРЕН" : policyPreview.status === "selected" ? "УЖЕ В КОНТЕКСТЕ" : "GOVERNOR BLOCK"}</p><b>{policyPreview.title}</b><p>IF: {policyPreview.if}</p><p>THEN: {policyPreview.then}</p><p>UNTIL: {policyPreview.until}</p><p className="configuration-cost">Цена: {policyPreview.price}</p>{policyPreview.reason && <p className="configuration-alternative">{policyPreview.reason}</p>}{policyPreview.alternative && <p className="configuration-alternative">{policyPreview.alternative}</p>}{policyPreview.status === "valid" && <button className="primary-cta" onClick={commitPolicy}>ПОСТАВИТЬ RULE НА СЛЕДУЮЩИЙ ТИК</button>}</div>}</section>
        {state.configuration.pending && <p className="configuration-pending">В очереди: {state.configuration.pending.title} · применится на тике {String(state.configuration.pending.staleAtTick).padStart(3, "0")}.</p>}
      </aside>}

      {serviceOpen && <aside className="service-sheet" role="dialog" aria-modal="true" aria-label="Сервис и обзор дня"><div className="sheet-top"><div><p className="eyebrow">МАТЕРИАЛЬНЫЕ FOLLOW-UPS</p><h2>Сервис<br />и обзор</h2></div><button className="icon-button" onClick={() => setServiceOpen(false)} aria-label="Закрыть сервис"><X size={19} /></button></div>
        <p className="service-intro">Каждая задача относится к видимому компоненту дома. Обслуживание ставится в очередь и получает bounded recovery на следующем тике.</p>
        <div className="service-list">{state.service.tasks.length ? state.service.tasks.map((task) => <article className={`service-task ${task.resolved ? "resolved" : "open"}`} key={task.id}><p className="eyebrow">{task.componentId.replace("component.", "КОМПОНЕНТ / ")}</p><h3>{task.trace}</h3><p>{task.action}</p>{task.resolved ? <p className="service-outcome">◆ {task.outcome}</p> : <button className="primary-cta" onClick={() => recoverService(task.id)} disabled={Boolean(state.service.pendingTaskId)}>ОБСЛУЖИТЬ НА СЛЕДУЮЩЕМ ТИКЕ</button>}</article>) : <p className="empty-note">Открытых задач пока нет. Бережный маршрут может завершить день без service follow-up.</p>}</div>
        {state.service.pendingTaskId && <p className="configuration-pending">ОБСЛУЖИВАНИЕ В ОЧЕРЕДИ · следующий fixed tick применит bounded recovery.</p>}
        {state.service.review.available && <section className="day-review"><p className="eyebrow">ОБЗОР ДНЯ</p><b>{state.service.review.key === "review.day.stewardship_complete" ? "Восстановление собрано" : "Открытые следы остаются видимыми"}</b><p>{state.service.review.text}</p><small>Service credits: {state.service.credits}. Это запись о компонентах, а не рейтинг игрока.</small></section>}
      </aside>}

      {helpOpen && <aside className="help-sheet" role="dialog" aria-modal="true" aria-label="Как играть"><button className="icon-button close-help" onClick={() => setHelpOpen(false)} aria-label="Закрыть помощь"><X size={19} /></button><CircleHelp size={30} /><h2>Как читать дом</h2><p>Жди два видимых предвестника, затем сравни пользу и цену двух маршрутов. Буквы, цвет и узор дублируют критический смысл.</p><dl><div><dt>Q</dt><dd>бережный маршрут</dd></div><div><dt>E</dt><dd>прямой маршрут</dd></div><div><dt>J / C</dt><dd>Archive / configuration</dd></div><div><dt>V</dt><dd>сервис и обзор дня</dd></div><div><dt>L / M</dt><dd>low-sensory / motion</dd></div></dl></aside>}
    </main>
  );
}

function ToggleRow({ icon, title, description, active, onClick, hotkey }: { icon: React.ReactNode; title: string; description: string; active: boolean; onClick: () => void; hotkey: string }) {
  return <button className={`toggle-row ${active ? "active" : ""}`} onClick={onClick} aria-pressed={active}><span className="toggle-icon">{icon}</span><span><b>{title}</b><small>{description}</small></span><i>{hotkey}</i><span className="switch-track"><span /></span></button>;
}
