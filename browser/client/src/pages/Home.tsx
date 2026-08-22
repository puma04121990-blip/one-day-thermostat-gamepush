// Design: Тихая технография — лента наблюдений слева, материальный cutaway справа, честные маршруты у нижнего края.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, AudioLines, ChevronDown, CircleHelp, Gauge, Moon, RotateCcw, Settings2, SlidersHorizontal, Sparkles, Trophy, Type, Wrench, X } from "lucide-react";
import { achievementDefinition } from "@/game/AchievementCatalog";
import { PhaserThermostat } from "@/components/PhaserThermostat";
import { entriesFor } from "@/game/ConfigurationCatalog";
import { serviceTraceKey } from "@/game/ServiceCatalog";
import { ThermostatSimulation } from "@/game/ThermostatSimulation";
import type { ConfigurationChannel, ConfigurationPreview, GameState, RouteKind } from "@/game/types";

const LOGO = "/manus-storage/thermostat-route-mark_4292ba1f.png";
const JOURNAL = "/manus-storage/thermostat-journal-backdrop_cb648cce.png";
const ATLAS = "/manus-storage/thermostat-sensor-atlas_4ee06309.png";

const settingsKey = "one-day-thermostat.phaser.profile.v1";
type Profile = { reducedMotion: boolean; lowSensory: boolean; textScale: number };

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
  const simulation = useMemo(() => new ThermostatSimulation(), []);
  const [state, setState] = useState<GameState>(() => simulation.snapshot());
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const [journalOpen, setJournalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [configurationOpen, setConfigurationOpen] = useState(false);
  const [configurationPreview, setConfigurationPreview] = useState<ConfigurationPreview | null>(null);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const receiveState = useCallback((next: GameState) => setState(next), []);
  const refresh = useCallback(() => setState(simulation.snapshot()), [simulation]);

  useEffect(() => {
    try { localStorage.setItem(settingsKey, JSON.stringify(profile)); } catch { /* Preference saving is opportunistic. */ }
  }, [profile]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "q") { simulation.chooseRoute("careful"); refresh(); }
      if (event.key.toLowerCase() === "e") { simulation.chooseRoute("direct"); refresh(); }
      if (event.key.toLowerCase() === "j") setJournalOpen((value) => !value);
      if (event.key.toLowerCase() === "a") setJournalOpen(true);
      if (event.key.toLowerCase() === "m") setProfile((value) => ({ ...value, reducedMotion: !value.reducedMotion }));
      if (event.key.toLowerCase() === "l") setProfile((value) => ({ ...value, lowSensory: !value.lowSensory }));
      if (event.key.toLowerCase() === "c") setConfigurationOpen((value) => !value);
      if (event.key.toLowerCase() === "v") setServiceOpen((value) => !value);
      if (event.key === "Escape") { setJournalOpen(false); setSettingsOpen(false); setConfigurationOpen(false); setServiceOpen(false); setHelpOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [refresh, simulation]);

  const begin = () => { simulation.start(); refresh(); };
  const choose = (route: RouteKind) => { simulation.chooseRoute(route); refresh(); };
  const restart = () => { simulation.reset(); refresh(); setJournalOpen(false); };
  const inspectConfiguration = (id: string, channel: ConfigurationChannel) => setConfigurationPreview(simulation.previewConfiguration(id, channel));
  const commitConfiguration = () => {
    if (!configurationPreview) return;
    if (simulation.queueConfiguration(configurationPreview)) refresh();
  };
  const recoverService = (taskId: string) => { if (simulation.queueServiceRecovery(taskId)) refresh(); };
  const openServiceTasks = state.service.tasks.filter((task) => !task.resolved);

  return (
    <main className={`thermostat-shell ${profile.lowSensory ? "low-sensory" : ""} ${profile.reducedMotion ? "reduce-motion" : ""}`} style={{ fontSize: `${profile.textScale}em` }}>
      <section className="game-stage" aria-label="Срез дома и материальные маршруты">
        <PhaserThermostat simulation={simulation} onState={receiveState} reducedMotion={profile.reducedMotion} />
        <div className="grain" />
        <div className="copper-route-map" aria-hidden="true"><span className="route-node node-a" /><span className="route-node node-b" /><span className="route-node node-c" /><span className="route-tag">МАРШРУТ / 03</span></div>

        <header className="top-bar">
          <button className="brand-lockup" onClick={() => setHelpOpen(true)} aria-label="О проекте и управлении">
            <img src={LOGO} alt="" />
            <span><b>ОДИН ДЕНЬ</b><em>ТЕРМОСТАТА</em></span>
          </button>
          <div className="top-actions">
            <button className="icon-button" onClick={() => setJournalOpen(true)} aria-label="Открыть журнал"><Archive size={18} /><span>J</span></button>
            <button className="icon-button" onClick={() => setConfigurationOpen(true)} aria-label="Открыть firmware и modifiers"><SlidersHorizontal size={18} /><span>C</span></button>
            <button className="icon-button" onClick={() => setServiceOpen(true)} aria-label="Открыть сервис и обзор дня"><Wrench size={17} /><span>V</span></button>
            <button className="icon-button" onClick={() => setSettingsOpen(true)} aria-label="Открыть настройки доступности"><Settings2 size={18} /></button>
          </div>
        </header>

        <aside className="observation-rail">
          <div className="tick-stamp"><span>ТИК</span><b>{String(state.tick).padStart(3, "0")}</b></div>
          <div className="phase-pill"><span className={`phase-dot phase-${state.phase}`} />{state.dayComplete ? "НОВЫЙ BASELINE" : state.phase === "warning" ? "РЕШЕНИЕ ВИДИМО" : "НАБЛЮДЕНИЕ"}</div>
          <p className="eyebrow">ЦЕПОЧКА {state.chainIndex + 1} / 3</p>
          <h1>{state.chainTitle}</h1>
          <p className="trace-copy">{state.trace}</p>
          <div className="caption-card"><AudioLines size={17} /><p>{state.caption}</p></div>
          <div className="sensor-stack" aria-label="Материальные датчики">
            {meters.map((meter) => {
              const value = Math.round(state.metrics[meter.key] * 100);
              return <div className="sensor-row" key={meter.key}>
                <span className="sensor-pattern">{meter.pattern}</span><span>{meter.name}</span><b>{value}</b>
              </div>;
            })}
          </div>
          <button className="achievement-strip" onClick={() => setJournalOpen(true)} aria-label="Открыть достижения в Archive"><Trophy size={16} /><span><b>{state.achievements.unlocked.length} LOCAL TRACE</b><small>{state.achievements.pendingPlatformTags.length ? `${state.achievements.pendingPlatformTags.length} ждут platform mirror` : "A · открыть Archive"}</small></span></button>
        </aside>

        <div className="canvas-caption"><Gauge size={15} /> <span>МАРШРУТЫ — МАТЕРИАЛЬНЫЕ; ЖИЛЬЦЫ НЕ ЯВЛЯЮТСЯ ЦЕЛЬЮ УПРАВЛЕНИЯ</span></div>

        {!state.started && <div className="onboarding" role="dialog" aria-modal="true" aria-label="Начать день">
          <div className="onboarding-mark"><img src={LOGO} alt="" /></div>
          <div className="onboarding-rule" />
          <p className="eyebrow">ЛОКАЛЬНЫЙ ДЕНЬ · СОХРАНЯЕТСЯ В БРАУЗЕРЕ</p>
          <h2>Дом уже говорит следами.<br /><i>Сначала наблюдай.</i></h2>
          <p>Ты не управляешь людьми и не ставишь диагнозы. Ты выбираешь видимые маршруты тепла, воздуха и восстановления.</p>
          <button className="primary-cta" onClick={begin}><span>НАЧАТЬ НАБЛЮДЕНИЕ</span><ChevronDown size={18} /></button>
          <small>Q — бережный маршрут · E — прямой маршрут · J — Journal</small>
        </div>}

        {state.started && !state.dayComplete && <section className="route-deck" aria-label="Доступные маршруты">
          <div className="route-deck-heading"><span>МАРШРУТЫ</span><p>{state.phase === "warning" ? "Две видимые цены. Ни один путь не завершает день преждевременно." : "Сначала дождись, пока дом покажет оба предвестника."}</p></div>
          <div className="route-options">
            {state.options.length > 0 ? state.options.map((option) => <button key={option.id} className={`route-card ${option.id}`} onClick={() => choose(option.id)}>
              <span className="route-key">{option.keyHint}</span><span className="route-label">{option.label}</span><b>{option.title}</b><p><strong>{option.benefit}</strong><em>цена: {option.cost}</em></p>
            </button>) : <div className="waiting-card"><Sparkles size={18} /><p>{state.phase === "active" ? "Маршрут уже работает. След появится в Archive." : "Дом собирает наблюдаемые следы…"}</p></div>}
          </div>
        </section>}

        {state.dayComplete && <section className="completion-card"><span className="completion-mark">◆</span><p className="eyebrow">ДЕНЬ СОБРАН</p><h2>Восстанавливаемый baseline<br />на завтра уже есть.</h2><p>Следы остались в Archive. Нерешённые материальные задачи можно взять с собой, но игра не наказывает за них.</p><button className="primary-cta" onClick={restart}><RotateCcw size={17} />НАЧАТЬ НОВЫЙ ДЕНЬ</button></section>}
      </section>

      {journalOpen && <aside className="journal-sheet" role="dialog" aria-modal="true" aria-label="Archive журнала" style={{ backgroundImage: `linear-gradient(90deg, rgba(9,18,29,.96), rgba(9,18,29,.76)), url(${JOURNAL})` }}>
        <div className="sheet-top"><div><p className="eyebrow">ARCHIVE / LOCAL</p><h2>Журнал дома</h2></div><button className="icon-button" onClick={() => setJournalOpen(false)} aria-label="Закрыть журнал"><X size={19} /></button></div>
        <p className="journal-intro">Каждая запись описывает материальный след и последствия маршрута. Она не является оценкой жильца.</p>
        <section className="achievement-ledger" aria-label="Локальные достижения"><div className="achievement-ledger-head"><Trophy size={18} /><span><p className="eyebrow">LOCAL ACHIEVEMENTS</p><b>Следы, а не power-up</b></span></div>{state.achievements.unlocked.length ? <div className="achievement-list">{state.achievements.unlocked.map((entry) => { const definition = achievementDefinition(entry.id); return <article key={entry.id}><span>◇</span><div><b>{definition?.title ?? entry.id}</b><p>{definition?.description ?? "Локальный trace сохранён."}</p><small>Т.{String(entry.unlockedTick).padStart(3, "0")}</small></div></article>; })}</div> : <p className="empty-note">Первые локальные следы появятся после авторитетных событий дня.</p>}{state.achievements.pendingPlatformTags.length > 0 && <p className="achievement-pending">PENDING MIRROR: {state.achievements.pendingPlatformTags.length}. Теги остаются local-first до подключения реального GamePush browser SDK.</p>}</section>
        <div className="journal-list">{state.archive.length ? [...state.archive].reverse().map((entry, index) => <article key={`${entry.tick}-${index}`} className={`journal-entry ${entry.tone}`}><span>Т.{String(entry.tick).padStart(3, "0")}</span><div><b>{entry.title}</b><p>{entry.body}</p></div></article>) : <p className="empty-note">Начни наблюдение — первые следы появятся здесь.</p>}</div>
        {state.unresolved.length > 0 && <div className="service-note"><b>ВИДИМЫЕ SERVICE TRACE</b>{state.unresolved.map((item, index) => <p key={serviceTraceKey(item, index)}>— {item}</p>)}</div>}
      </aside>}

      {settingsOpen && <aside className="settings-sheet" role="dialog" aria-modal="true" aria-label="Настройки доступности"><div className="sheet-top"><div><p className="eyebrow">ПРОФИЛЬ ИГРОКА</p><h2>Доступность</h2></div><button className="icon-button" onClick={() => setSettingsOpen(false)} aria-label="Закрыть настройки"><X size={19} /></button></div>
        <ToggleRow icon={<Moon size={18} />} title="Low-sensory" description="Убирает несущественные motion и сохраняет все смыслы." active={profile.lowSensory} onClick={() => setProfile((value) => ({ ...value, lowSensory: !value.lowSensory }))} hotkey="L" />
        <ToggleRow icon={<Sparkles size={18} />} title="Reduced motion" description="Маршруты и изменения состояния становятся мгновенными." active={profile.reducedMotion} onClick={() => setProfile((value) => ({ ...value, reducedMotion: !value.reducedMotion }))} hotkey="M" />
        <div className="text-scale"><div><Type size={18} /><span><b>Размер текста</b><small>90–125% · сохраняется локально</small></span></div><input aria-label="Размер текста" type="range" min="0.9" max="1.25" step="0.05" value={profile.textScale} onChange={(event) => setProfile((value) => ({ ...value, textScale: Number(event.target.value) }))} /><b>{Math.round(profile.textScale * 100)}%</b></div>
      </aside>}

      {configurationOpen && <aside className="configuration-sheet" role="dialog" aria-modal="true" aria-label="Firmware и modifiers"><div className="sheet-top"><div><p className="eyebrow">БЕЗОПАСНАЯ КОНФИГУРАЦИЯ</p><h2>Контуры<br />наблюдения</h2></div><button className="icon-button" onClick={() => setConfigurationOpen(false)} aria-label="Закрыть конфигурацию"><X size={19} /></button></div>
        <p className="configuration-intro">Сначала посмотри пользу и цену. Выбор попадёт в очередь и применится только на следующем тике; он не меняет людей или скрытые причины.</p>
        {configurationSections.map((section) => <section className="configuration-section" key={section.channel}><div className="configuration-section-head"><b>{section.label}</b><small>{section.note}</small></div><div className="configuration-options">{entriesFor(section.channel).map((entry) => <button key={entry.id} className={`configuration-choice ${configurationPreview?.selectionId === entry.id ? "inspected" : ""}`} onClick={() => inspectConfiguration(entry.id, section.channel)} aria-pressed={configurationPreview?.selectionId === entry.id}><span className="configuration-node">◆</span><span><b>{entry.title}</b><small>{entry.effect}</small><em>цена: {entry.tradeoff}</em></span></button>)}</div></section>)}
        <section className={`configuration-preview ${configurationPreview?.status ?? "empty"}`} aria-live="polite">{configurationPreview ? <><p className="eyebrow">{configurationPreview.status === "valid" ? "PREVIEW · НЕ МЕНЯЕТ ДЕНЬ" : configurationPreview.status === "selected" ? "УЖЕ АКТИВНО" : "ЗАБЛОКИРОВАНО"}</p><b>{configurationPreview.title}</b><p>{configurationPreview.effect}</p><p className="configuration-cost">Цена: {configurationPreview.tradeoff}</p>{configurationPreview.alternative && <p className="configuration-alternative">{configurationPreview.alternative}</p>}{configurationPreview.status === "valid" && <button className="primary-cta" onClick={commitConfiguration}>ПРИМЕНИТЬ НА СЛЕДУЮЩЕМ ТИКЕ</button>}</> : <p>Выбери элемент каталога — preview покажет результат до любого commit.</p>}</section>
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
