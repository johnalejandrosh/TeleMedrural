import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cilCheckCircle, cilClock, cilCloudDownload, cilFolderOpen } from "@coreui/icons";
import { NoAccess } from "@/components/admin/no-access";
import { CaseListItem } from "@/components/med/case-list";
import { DailyChart } from "@/components/med/daily-chart";
import { Icon } from "@/components/med/icon";
import { PageHead } from "@/components/med/page-head";
import { PageSkeleton } from "@/components/med/skeletons";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { CARE_PLANS } from "@/lib/med/catalog";
import { caseCode, duracion, fullName, hace, nowMs } from "@/lib/med/format";
import { RISK_INFO, RISK_ORDER } from "@/lib/med/news2";
import { caseScope, getDashboard } from "@/lib/server/case-queries";
import { hasPermission, requireUser } from "@/lib/server/dal";

export const metadata: Metadata = {
  title: "Inicio",
};

export default function HomePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <HomeSection />
    </Suspense>
  );
}

const PARAM = { HIGH: "alto", MEDIUM: "medio", LOW_MEDIUM: "bajo-medio", LOW: "bajo" } as const;

function saludo(now: number) {
  const h = Number(new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", hour: "numeric", hourCycle: "h23" }).format(now));
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
}

async function HomeSection() {
  const user = await requireUser();
  if (!hasPermission(user, PERMISSIONS.DASHBOARD_VIEW)) return <NoAccess permission={PERMISSIONS.DASHBOARD_VIEW} />;
  const scope = caseScope(user);
  const now = nowMs();
  const firstName = user.name.replace(/^(Dra?\.|Enf\.)\s+/, "").split(/\s+/)[0];

  if (!scope) {
    return (
      <>
        <PageHead title={`${saludo(now)}, ${firstName}`} subtitle={user.roleName} />
        <div className="card">
          <div className="card-body empty-state">
            <h2 className="h5">Su rol no tiene acceso a los casos</h2>
            <p className="text-body-secondary mb-0">Use el menú para ir a la administración de la plataforma.</p>
          </div>
        </div>
      </>
    );
  }

  const own = !hasPermission(user, PERMISSIONS.CASES_READ);
  const d = await getDashboard(scope);
  const urgent = d.byRisk.HIGH + d.byRisk.MEDIUM;

  return (
    <>
      <PageHead
        title={`${saludo(now)}, ${firstName}`}
        subtitle={
          own
            ? "Resumen de los casos que usted registró en campo."
            : urgent
              ? `Hay ${urgent} ${urgent === 1 ? "caso urgente" : "casos urgentes"} (riesgo alto o medio) esperando revisión.`
              : "No hay casos urgentes esperando revisión."
        }
      >
        <Link href="/dashboard/casos?estado=pendiente" className="btn btn-primary d-inline-flex align-items-center gap-2">
          <Icon icon={cilFolderOpen} /> {own ? "Ver mis casos" : "Ir a la bandeja"}
        </Link>
      </PageHead>

      <div className="kpi-row">
        <div className="card stat">
          <div className="card-body">
            <span className="stat__icon">
              <Icon icon={cilFolderOpen} />
            </span>
            <span className="stat__label">Pendientes de revisión</span>
            <b className="stat__value">{d.pendientes}</b>
            <span className="stat__foot">{urgent ? `${urgent} de riesgo alto o medio` : "Ninguno urgente"}</span>
          </div>
        </div>
        <div className="card stat">
          <div className="card-body">
            <span className="stat__icon stat__icon--c2">
              <Icon icon={cilCloudDownload} />
            </span>
            <span className="stat__label">Recibidos hoy</span>
            <b className="stat__value">{d.hoy}</b>
            <span className="stat__foot">Sincronizados desde la app</span>
          </div>
        </div>
        <div className="card stat">
          <div className="card-body">
            <span className="stat__icon stat__icon--c3">
              <Icon icon={cilCheckCircle} />
            </span>
            <span className="stat__label">Revisados (7 días)</span>
            <b className="stat__value">{d.revisados7}</b>
            <span className="stat__foot">Con concepto del profesional</span>
          </div>
        </div>
        <div className="card stat">
          <div className="card-body">
            <span className="stat__icon stat__icon--c4">
              <Icon icon={cilClock} />
            </span>
            <span className="stat__label">Tiempo a la revisión</span>
            <b className="stat__value">{d.medianaRevisionMs === null ? "—" : duracion(d.medianaRevisionMs)}</b>
            <span className="stat__foot">Mediana desde que llega el caso</span>
          </div>
        </div>
      </div>

      <div className="grid-main">
        <section className="card" aria-labelledby="urgentes-title">
          <div className="card-body">
            <div className="card-title-row">
              <h2 id="urgentes-title">{own ? "Mis casos en espera" : "Atender primero"}</h2>
              <Link href="/dashboard/casos?estado=pendiente">Ver todos</Link>
            </div>
            <div className="triage-bars" aria-label="Pendientes por nivel de riesgo">
              {RISK_ORDER.map((r) => (
                <Link key={r} href={`/dashboard/casos?estado=pendiente&riesgo=${PARAM[r]}`} className={`triage-bar triage-bar--${RISK_INFO[r].tone}`}>
                  <span>{RISK_INFO[r].short}</span>
                  <b>{d.byRisk[r]}</b>
                </Link>
              ))}
            </div>
            {d.urgentes.length ? (
              <div className="case-list">
                {d.urgentes.map((c) => (
                  <CaseListItem key={c.id} c={c} now={now} compact />
                ))}
              </div>
            ) : (
              <p className="vacio">No hay casos pendientes. Los nuevos aparecerán aquí en cuanto los promotores sincronicen.</p>
            )}
          </div>
        </section>

        <div className="side-stack">
          <section className="card" aria-labelledby="serie-title">
            <div className="card-body">
              <div className="card-title-row">
                <h2 id="serie-title">Casos recibidos · 14 días</h2>
              </div>
              <DailyChart data={d.serie} />
            </div>
          </section>

          <section className="card" aria-labelledby="notas-title">
            <div className="card-body">
              <div className="card-title-row">
                <h2 id="notas-title">{own ? "Conceptos recibidos" : "Últimas observaciones"}</h2>
              </div>
              {d.ultimasNotas.length ? (
                <ul className="mini-list">
                  {d.ultimasNotas.map((n) => (
                    <li key={n.id}>
                      <Link href={`/dashboard/casos/${n.case.id}`}>
                        <span className="min-w-0">
                          <b>
                            {fullName(n.case.patient)} <span className="text-body-secondary fw-normal">· {caseCode(n.case.number)}</span>
                          </b>
                          <span className="text-truncate d-block">{n.body}</span>
                          <span className="small text-body-secondary">
                            {n.author.name} · {hace(n.createdAt, now)}
                            {n.carePlan && ` · ${CARE_PLANS[n.carePlan].label}`}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="vacio">Todavía no hay observaciones médicas.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
