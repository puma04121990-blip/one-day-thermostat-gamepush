// Design: Тихая технография — loading is a readable material transition, never an opaque spinner or authority over simulation.
type Props = { status: "idle" | "loading" | "booting" | "ready"; reducedMotion: boolean };

const STATUS = {
  loading: { value: 36, label: "ЗАГРУЖАЕМ ДВИЖОК", detail: "Собираем лёгкий canvas runtime для этого дня." },
  booting: { value: 72, label: "ДОМ СОБИРАЕТ СРЕЗ", detail: "Проверяем контуры наблюдения и material routes." }
} as const;

export function EngineLoadingProgress({ status, reducedMotion }: Props) {
  if (status !== "loading" && status !== "booting") return null;
  const current = STATUS[status];
  return <section className={`engine-progress ${reducedMotion ? "reduce-motion" : ""}`} role="status" aria-live="polite" aria-label={`${current.label}: ${current.value}%`}>
    <div className="engine-progress-copy"><span className="eyebrow">LOCAL ENGINE / DEFERRED LOAD</span><b>{current.label}</b><p>{current.detail}</p></div>
    <div className="engine-progress-meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={current.value} aria-valuetext={`${current.value}%`}><span style={{ "--progress": `${current.value}%` } as React.CSSProperties} /></div>
    <small>{current.value}% · При reduced motion статус останется текстовым и мгновенным.</small>
  </section>;
}
