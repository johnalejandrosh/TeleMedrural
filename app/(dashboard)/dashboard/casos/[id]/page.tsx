import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cilArrowLeft, cilLocationPin, cilMobile } from "@coreui/icons";
import { NoAccess } from "@/components/admin/no-access";
import { Icon } from "@/components/med/icon";
import { NoteForm, PrintButton, ReopenButton } from "@/components/med/note-form";
import { PageHead } from "@/components/med/page-head";
import { RiskBadge, StatusBadge } from "@/components/med/risk";
import { ListSkeleton } from "@/components/med/skeletons";
import { VitalsPanel } from "@/components/med/vitals";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { CARE_PLANS, CONDITIONS, DOCUMENT_TYPES, label, SEX_TXT, SYMPTOMS, type CarePlanKey } from "@/lib/med/catalog";
import { ageAt, ageText, caseCode, duracion, fmtFechaDia, fmtFechaHora, fullName, nowMs } from "@/lib/med/format";
import { RISK_INFO, type News2Param, type Risk } from "@/lib/med/news2";
import { caseScope, getCaseDetail } from "@/lib/server/case-queries";
import { hasPermission, requireUser } from "@/lib/server/dal";

export const metadata: Metadata = {
  title: "Caso",
};

type Params = Promise<{ id: string }>;

export default function CasePage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<ListSkeleton rows={6} />}>
      <CaseSection params={params} />
    </Suspense>
  );
}

const SUGGESTED_PLAN: Record<Risk, CarePlanKey> = { HIGH: "EMERGENCY", MEDIUM: "REFERRAL", LOW_MEDIUM: "APPOINTMENT", LOW: "HOME_CARE" };

async function CaseSection({ params }: { params: Params }) {
  const user = await requireUser();
  const scope = caseScope(user);
  if (!scope) return <NoAccess permission={PERMISSIONS.CASES_READ} />;

  const { id } = await params;
  const c = await getCaseDetail(id, scope);
  if (!c) notFound();

  const canReview = hasPermission(user, PERMISSIONS.CASES_REVIEW);
  const canPatients = hasPermission(user, PERMISSIONS.PATIENTS_READ);
  const p = c.patient;
  const age = ageAt(p.birthDate, c.capturedAt);
  const breakdown = (c.news2Breakdown ?? null) as Record<News2Param, number | null> | null;
  const risk = c.riskLevel as Risk | null;
  const deviceMismatch = c.news2DeviceScore !== null && c.news2Score !== null && c.news2DeviceScore !== c.news2Score;
  const news2Caution = age < 16 || c.pregnant;
  const waitMs = (c.reviewedAt ? c.reviewedAt.getTime() : nowMs()) - c.syncedAt.getTime();

  return (
    <div className="case-detail">
      <Link href="/dashboard/casos" className="volver no-print">
        <Icon icon={cilArrowLeft} size="sm" /> Bandeja de casos
      </Link>

      <PageHead
        eyebrow={`${caseCode(c.number)} · ${c.vereda ? `${c.vereda}, ` : ""}${c.municipality}`}
        title={fullName(p)}
        subtitle={
          <>
            {ageText(p.birthDate, c.capturedAt)} · {SEX_TXT[p.sex]}
            {c.pregnant && " · Gestante"} · {p.documentType === "SD" ? "Sin documento" : `${p.documentType} ${p.documentNumber}`}
          </>
        }
      >
        <StatusBadge status={c.status} />
        <PrintButton />
        {canReview && c.status === "REVIEWED" && <ReopenButton caseId={c.id} />}
      </PageHead>

      <div className="case-grid">
        <div className="case-grid__main">
          {/* --------------------------------------------------- Pre-triaje */}
          <section className={`card news2-card news2-card--${risk ? RISK_INFO[risk].tone : "sin"}`} aria-labelledby="news2-title">
            <div className="card-body">
              <div className="news2-card__head">
                <div className="news2-card__score" aria-hidden={c.news2Score === null}>
                  <span>NEWS2</span>
                  <b>{c.news2Score ?? "—"}</b>
                </div>
                <div className="min-w-0">
                  <h2 id="news2-title" className="h5 mb-1">
                    Pre-triaje: {risk ? RISK_INFO[risk].label.toLowerCase() : "sin signos vitales"}
                  </h2>
                  <p className="mb-0">{risk ? RISK_INFO[risk].response : "La ficha no trae signos vitales: priorice según el motivo de consulta."}</p>
                </div>
                <RiskBadge risk={risk} size="lg" />
              </div>
              {(c.news2Incomplete || deviceMismatch || news2Caution) && (
                <ul className="news2-card__notes">
                  {c.news2Incomplete && risk && <li>Faltan signos vitales: el puntaje es parcial y puede subestimar el riesgo.</li>}
                  {deviceMismatch && (
                    <li>
                      La app calculó {c.news2DeviceScore} y la plataforma {c.news2Score}. Se muestra el valor de la plataforma; revise la versión de la app
                      {c.syncBatch?.appVersion ? ` (${c.syncBatch.appVersion})` : ""}.
                    </li>
                  )}
                  {news2Caution && <li>NEWS2 no está validado en menores de 16 años ni en gestantes: interprete el puntaje con criterio clínico.</li>}
                </ul>
              )}
            </div>
          </section>

          <section className="card" aria-labelledby="vitals-title">
            <div className="card-body">
              <div className="card-title-row">
                <h2 id="vitals-title">Signos vitales</h2>
                <span className="small text-body-secondary">Tomados en campo · {fmtFechaHora(c.capturedAt)}</span>
              </div>
              <VitalsPanel c={c} breakdown={breakdown} />
            </div>
          </section>

          <div className="grid2">
            <section className="card" aria-labelledby="motivo-title">
              <div className="card-body">
                <h2 id="motivo-title" className="card-title-sm">
                  Motivo de consulta
                </h2>
                <p className="lead-text">{c.chiefComplaint}</p>
                {c.symptoms.length > 0 && (
                  <div className="tag-list">
                    {c.symptoms.map((s) => (
                      <span key={s}>{label(SYMPTOMS, s)}</span>
                    ))}
                  </div>
                )}
                <dl className="facts mt-3">
                  {c.onsetDays !== null && (
                    <>
                      <dt>Evolución</dt>
                      <dd>{c.onsetDays === 0 ? "Menos de un día" : `${c.onsetDays} ${c.onsetDays === 1 ? "día" : "días"}`}</dd>
                    </>
                  )}
                  {c.symptomsNotes && (
                    <>
                      <dt>Notas del promotor</dt>
                      <dd className="pre-line">{c.symptomsNotes}</dd>
                    </>
                  )}
                </dl>
              </div>
            </section>
            <section className="card" aria-labelledby="antecedentes-title">
              <div className="card-body">
                <h2 id="antecedentes-title" className="card-title-sm">
                  Antecedentes
                </h2>
                {c.conditions.length ? (
                  <div className="tag-list tag-list--muted">
                    {c.conditions.map((s) => (
                      <span key={s}>{label(CONDITIONS, s)}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-body-secondary">Sin enfermedades crónicas reportadas.</p>
                )}
                <dl className="facts mt-3">
                  <dt>Alergias</dt>
                  <dd>{c.allergies ?? "No refiere"}</dd>
                  <dt>Medicamentos</dt>
                  <dd>{c.medications ?? "No refiere"}</dd>
                  {p.sex !== "M" && c.pregnant !== null && (
                    <>
                      <dt>Gestación</dt>
                      <dd>{c.pregnant ? "Sí" : "No"}</dd>
                    </>
                  )}
                  {c.backgroundNotes && (
                    <>
                      <dt>Otros</dt>
                      <dd className="pre-line">{c.backgroundNotes}</dd>
                    </>
                  )}
                </dl>
              </div>
            </section>
          </div>

          {/* --------------------------------------------------- Observaciones */}
          <section className="card" aria-labelledby="notas-title">
            <div className="card-body">
              <div className="card-title-row">
                <h2 id="notas-title">Observaciones médicas</h2>
                <span className="small text-body-secondary">{c.notes.length ? `${c.notes.length} registradas` : "Ninguna todavía"}</span>
              </div>
              {c.notes.length > 0 && (
                <ol className="notes">
                  {c.notes.map((n) => (
                    <li key={n.id} className="note">
                      <div className="note__head">
                        <b>{n.author.name}</b>
                        <span>
                          {n.author.role.name}
                          {n.author.professionalId && ` · RP ${n.author.professionalId}`}
                        </span>
                        <time dateTime={n.createdAt.toISOString()}>{fmtFechaHora(n.createdAt)}</time>
                      </div>
                      <p className="pre-line mb-0">{n.body}</p>
                      {n.carePlan && <span className={`care-tag care-tag--${n.carePlan.toLowerCase()}`}>{CARE_PLANS[n.carePlan].label}</span>}
                    </li>
                  ))}
                </ol>
              )}
              {canReview ? (
                <NoteForm caseId={c.id} pending={c.status === "PENDING"} suggestedPlan={c.status === "PENDING" && risk ? SUGGESTED_PLAN[risk] : null} />
              ) : (
                !c.notes.length && <p className="text-body-secondary mb-0">El personal de salud todavía no ha revisado este caso.</p>
              )}
            </div>
          </section>
        </div>

        {/* --------------------------------------------------- Lateral */}
        <aside className="case-grid__side">
          <section className="card">
            <div className="card-body">
              <h2 className="card-title-sm">Paciente</h2>
              <dl className="facts">
                <dt>Documento</dt>
                <dd>{p.documentType === "SD" ? "Sin documento" : `${DOCUMENT_TYPES[p.documentType]} ${p.documentNumber}`}</dd>
                <dt>Nacimiento</dt>
                <dd>{fmtFechaDia(p.birthDate)}</dd>
                <dt>Aseguradora</dt>
                <dd>{p.insurer ?? "Sin dato"}</dd>
                <dt>Teléfono</dt>
                <dd>{p.phone ? <a href={`tel:${p.phone.replace(/\s/g, "")}`}>{p.phone}</a> : "Sin dato"}</dd>
                <dt>Residencia</dt>
                <dd>{p.vereda ? `${p.vereda}, ${p.municipality}` : p.municipality}</dd>
              </dl>
              {canPatients && (
                <Link href={`/dashboard/pacientes/${p.id}`} className="btn btn-sm btn-outline-primary w-100 mt-3">
                  Historial del paciente
                </Link>
              )}
            </div>
          </section>

          <section className="card">
            <div className="card-body">
              <h2 className="card-title-sm">Trazabilidad</h2>
              <ol className="trace">
                <li>
                  <b>Atención en campo</b>
                  <span>{fmtFechaHora(c.capturedAt)}</span>
                  <span>
                    {c.capturedBy.name}
                    {c.capturedBy.phone && (
                      <>
                        {" · "}
                        <a href={`tel:${c.capturedBy.phone.replace(/\s/g, "")}`}>{c.capturedBy.phone}</a>
                      </>
                    )}
                  </span>
                </li>
                <li>
                  <b>
                    <Icon icon={cilMobile} size="sm" /> Sincronizado
                  </b>
                  <span>{fmtFechaHora(c.syncedAt)}</span>
                  <span>
                    {duracion(c.syncedAt.getTime() - c.capturedAt.getTime())} sin señal
                    {c.syncBatch?.appVersion && ` · app ${c.syncBatch.appVersion}`}
                  </span>
                </li>
                <li className={c.reviewedAt ? "" : "is-pending"}>
                  <b>{c.reviewedAt ? "Revisado" : "En espera de revisión"}</b>
                  <span>{c.reviewedAt ? fmtFechaHora(c.reviewedAt) : `Hace ${duracion(waitMs)}`}</span>
                  {c.reviewedBy && <span>{c.reviewedBy.name}</span>}
                </li>
              </ol>
              {c.latitude !== null && c.longitude !== null && (
                <a
                  className="btn btn-sm btn-outline-secondary w-100 mt-2 d-inline-flex align-items-center justify-content-center gap-2"
                  href={`https://www.openstreetmap.org/?mlat=${c.latitude}&mlon=${c.longitude}#map=15/${c.latitude}/${c.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon icon={cilLocationPin} size="sm" /> Ver ubicación de la atención
                </a>
              )}
            </div>
          </section>

          {c.history.length > 0 && (
            <section className="card">
              <div className="card-body">
                <h2 className="card-title-sm">Atenciones anteriores</h2>
                <ul className="mini-list">
                  {c.history.map((h) => (
                    <li key={h.id}>
                      <Link href={`/dashboard/casos/${h.id}`}>
                        <RiskBadge risk={h.riskLevel as Risk | null} score={h.news2Score} size="sm" />
                        <span className="min-w-0">
                          <b>{fmtFechaHora(h.capturedAt)}</b>
                          <span className="text-truncate d-block">{h.chiefComplaint}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
