import Link from "next/link";
import { cilChevronRight, cilCommentSquare } from "@coreui/icons";
import { label, SEX_TXT, SYMPTOMS } from "@/lib/med/catalog";
import { ageText, caseCode, fmtFechaHora, fullName, hace } from "@/lib/med/format";
import type { CaseRow } from "@/lib/server/case-queries";
import { Icon } from "./icon";
import { RiskBadge, RiskEdge, StatusBadge } from "./risk";

/** Fila de la bandeja: prioridad, paciente, motivo, lugar y tiempo de espera. */
export function CaseListItem({ c, now, compact = false }: { c: CaseRow; now: number; compact?: boolean }) {
  const waiting = c.status === "PENDING";
  return (
    <Link href={`/dashboard/casos/${c.id}`} className={`case-item ${compact ? "case-item--compact" : ""}`}>
      <RiskEdge risk={c.riskLevel} />
      <div className="case-item__risk">
        <RiskBadge risk={c.riskLevel} score={c.news2Score} incomplete={c.news2Incomplete} />
      </div>
      <div className="case-item__main">
        <div className="case-item__title">
          <span className="case-item__name">{fullName(c.patient)}</span>
          <span className="case-item__meta">
            {ageText(c.patient.birthDate, c.capturedAt)} · {SEX_TXT[c.patient.sex]}
            {c.pregnant && " · Gestante"}
          </span>
        </div>
        <p className="case-item__complaint">{c.chiefComplaint}</p>
        {!compact && c.symptoms.length > 0 && (
          <div className="case-item__tags">
            {c.symptoms.slice(0, 4).map((s) => (
              <span key={s}>{label(SYMPTOMS, s)}</span>
            ))}
            {c.symptoms.length > 4 && <span>+{c.symptoms.length - 4}</span>}
          </div>
        )}
      </div>
      {!compact && (
        <div className="case-item__place">
          <span>{c.vereda ? `${c.vereda}, ${c.municipality}` : c.municipality}</span>
          <span className="text-body-secondary">Promotor: {c.capturedBy.name}</span>
        </div>
      )}
      <div className="case-item__time">
        <span className="case-item__code">{caseCode(c.number)}</span>
        <span title={`Atendido en campo: ${fmtFechaHora(c.capturedAt)}`}>{waiting ? `Espera ${hace(c.capturedAt, now).replace("hace ", "")}` : `Revisado ${hace(c.reviewedAt ?? c.syncedAt, now)}`}</span>
        <span className="d-inline-flex align-items-center gap-2">
          <StatusBadge status={c.status} />
          {c._count.notes > 0 && (
            <span className="case-item__notes" title={`${c._count.notes} observaciones`}>
              <Icon icon={cilCommentSquare} size="sm" /> {c._count.notes}
            </span>
          )}
        </span>
      </div>
      <Icon icon={cilChevronRight} className="case-item__arrow" />
    </Link>
  );
}
