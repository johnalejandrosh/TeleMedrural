import { RISK_INFO, RISK_ORDER } from "@/lib/med/news2";

type Day = { day: string; HIGH: number; MEDIUM: number; LOW_MEDIUM: number; LOW: number; NONE: number };

const SERIES = [...RISK_ORDER.map((r) => ({ key: r, tone: RISK_INFO[r].tone, label: RISK_INFO[r].short })), { key: "NONE" as const, tone: "sin", label: "Sin signos" }];

const dayLabel = new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", day: "numeric", month: "short" });
const weekday = new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", weekday: "narrow" });

/** Casos recibidos por día (barras apiladas por riesgo). SVG puro: toma los colores del tema. */
export function DailyChart({ data }: { data: Day[] }) {
  const totals = data.map((d) => SERIES.reduce((s, x) => s + d[x.key], 0));
  const max = Math.max(4, ...totals);
  const step = max <= 8 ? 2 : max <= 20 ? 5 : 10;
  const top = Math.ceil(max / step) * step;
  const W = 560;
  const H = 180;
  const pad = { l: 28, r: 8, t: 8, b: 30 };
  const bw = (W - pad.l - pad.r) / data.length;
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / top);
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);

  return (
    <figure className="daily-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Casos recibidos en los últimos ${data.length} días: ${totals.reduce((a, b) => a + b, 0)} en total`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="daily-chart__grid" />
            <text x={pad.l - 6} y={y(t) + 3} textAnchor="end" className="daily-chart__axis">
              {t}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          let acc = 0;
          const x = pad.l + i * bw + bw * 0.18;
          const date = new Date(`${d.day}T12:00:00Z`);
          return (
            <g key={d.day}>
              <title>{`${dayLabel.format(date)}: ${totals[i]} casos`}</title>
              {SERIES.map((s) => {
                const v = d[s.key];
                if (!v) return null;
                const y0 = y(acc);
                acc += v;
                return <rect key={s.key} x={x} width={bw * 0.64} y={y(acc)} height={Math.max(0, y0 - y(acc) - 1)} rx={2} className={`daily-chart__bar--${s.tone}`} />;
              })}
              <text x={x + bw * 0.32} y={H - 16} textAnchor="middle" className="daily-chart__axis">
                {weekday.format(date)}
              </text>
              {(i % 2 === 1 || data.length <= 7) && (
                <text x={x + bw * 0.32} y={H - 4} textAnchor="middle" className="daily-chart__axis daily-chart__axis--sm">
                  {date.getUTCDate()}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="daily-chart__legend">
        {SERIES.map((s) => (
          <span key={s.key}>
            <span className={`risk-dot risk-dot--${s.tone}`} aria-hidden="true" />
            {s.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
