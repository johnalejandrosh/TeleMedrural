import { RISK_INFO, RISK_ORDER, type Risk } from "@/lib/med/news2";

const tone = (risk: Risk | null) => (risk ? RISK_INFO[risk].tone : "sin");

/** Insignia de prioridad NEWS2: color + texto (nunca solo color) y el puntaje. */
export function RiskBadge({ risk, score, incomplete = false, size = "md" }: { risk: Risk | null; score?: number | null; incomplete?: boolean; size?: "sm" | "md" | "lg" }) {
  return (
    <span className={`risk-badge risk-badge--${tone(risk)} risk-badge--${size}`}>
      {typeof score === "number" && (
        <span className="risk-badge__score" aria-label={`NEWS2 ${score}${incomplete ? ", parcial" : ""}`}>
          {score}
          {incomplete && <span className="risk-badge__partial" aria-hidden="true">*</span>}
        </span>
      )}
      <span className="risk-badge__label">{risk ? RISK_INFO[risk].short : "Sin signos"}</span>
    </span>
  );
}

/** Barra vertical de color al borde de las filas de la bandeja. */
export function RiskEdge({ risk }: { risk: Risk | null }) {
  return <span className={`risk-edge risk-edge--${tone(risk)}`} aria-hidden="true" />;
}

export function StatusBadge({ status }: { status: "PENDING" | "REVIEWED" }) {
  return status === "PENDING" ? <span className="status-badge status-badge--pending">Pendiente</span> : <span className="status-badge status-badge--reviewed">Revisado</span>;
}

export function RiskLegend() {
  return (
    <div className="risk-legend">
      {RISK_ORDER.map((r) => (
        <span key={r}>
          <span className={`risk-dot risk-dot--${RISK_INFO[r].tone}`} aria-hidden="true" />
          <b>{RISK_INFO[r].label}</b> ({RISK_INFO[r].range}): {RISK_INFO[r].response}
        </span>
      ))}
    </div>
  );
}
