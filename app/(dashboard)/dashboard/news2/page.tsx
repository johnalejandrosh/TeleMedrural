import type { Metadata } from "next";
import { Suspense } from "react";
import { NoAccess } from "@/components/admin/no-access";
import { News2Calculator } from "@/components/med/news2-calculator";
import { PageHead } from "@/components/med/page-head";
import { RiskBadge } from "@/components/med/risk";
import { ListSkeleton } from "@/components/med/skeletons";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { NEWS2_PARAMS, PARAM_INFO, RISK_INFO, RISK_ORDER, SPO2_SCALE2_BANDS } from "@/lib/med/news2";
import { hasPermission, requireUser } from "@/lib/server/dal";

export const metadata: Metadata = {
  title: "Escala NEWS2",
};

export default function News2Page() {
  return (
    <>
      <PageHead
        eyebrow="Referencia clínica"
        title="Escala NEWS2"
        subtitle="National Early Warning Score 2 (Royal College of Physicians, 2017). Es la regla que la app aplica sin conexión y que la plataforma verifica al recibir cada caso."
      />
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <News2Section />
      </Suspense>
    </>
  );
}

const SCORE_COLS = [3, 2, 1, 0, 1, 2, 3];
const colTone = (s: number) => (s === 0 ? "bajo" : s === 1 ? "medio" : s === 2 ? "alto" : "critico");

async function News2Section() {
  const user = await requireUser();
  if (!hasPermission(user, PERMISSIONS.DASHBOARD_VIEW)) return <NoAccess permission={PERMISSIONS.DASHBOARD_VIEW} />;

  return (
    <div className="d-grid gap-4">
      <section className="card">
        <div className="card-body">
          <div className="card-title-row">
            <h2>Puntaje por parámetro</h2>
          </div>
          <div className="table-responsive">
            <table className="table news2-table mb-0">
              <thead>
                <tr>
                  <th>Parámetro</th>
                  {SCORE_COLS.map((s, i) => (
                    <th key={i} className={`text-center news2-table__h--${colTone(s)}`}>
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {NEWS2_PARAMS.map((p) => (
                  <tr key={p}>
                    <th scope="row">
                      {PARAM_INFO[p].label}
                      {PARAM_INFO[p].unit && <span className="text-body-secondary fw-normal"> ({PARAM_INFO[p].unit})</span>}
                    </th>
                    {PARAM_INFO[p].bands.map((b, i) => (
                      <td key={i} className={`text-center ${b ? `news2-table__c--${colTone(SCORE_COLS[i])}` : ""}`}>
                        {b}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <th scope="row">
                    SpO₂ escala 2 <span className="text-body-secondary fw-normal">(%)</span>
                  </th>
                  {SPO2_SCALE2_BANDS.map((b, i) => (
                    <td key={i} className={`text-center news2-table__c--${colTone(SCORE_COLS[i])}`}>
                      {b}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="small text-body-secondary mt-3 mb-0">
            La escala 2 de SpO₂ se usa solo en pacientes con insuficiencia respiratoria hipercápnica confirmada (p. ej. EPOC), con meta de 88–92 %. NEWS2 no
            está validado en menores de 16 años ni en gestantes.
          </p>
        </div>
      </section>

      <div className="grid2">
        <section className="card">
          <div className="card-body">
            <div className="card-title-row">
              <h2>Nivel de riesgo y respuesta</h2>
            </div>
            <ul className="risk-table">
              {RISK_ORDER.map((r) => (
                <li key={r}>
                  <RiskBadge risk={r} />
                  <div>
                    <b>{RISK_INFO[r].range}</b>
                    <span>{RISK_INFO[r].response}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section className="card">
          <div className="card-body">
            <div className="card-title-row">
              <h2>Calculadora</h2>
            </div>
            <News2Calculator />
          </div>
        </section>
      </div>
    </div>
  );
}
