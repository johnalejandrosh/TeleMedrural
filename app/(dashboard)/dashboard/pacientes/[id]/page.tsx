import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cilArrowLeft } from "@coreui/icons";
import { NoAccess } from "@/components/admin/no-access";
import { Icon } from "@/components/med/icon";
import { PageHead } from "@/components/med/page-head";
import { RiskBadge, StatusBadge } from "@/components/med/risk";
import { ListSkeleton } from "@/components/med/skeletons";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DOCUMENT_TYPES, SEX_TXT } from "@/lib/med/catalog";
import { ageText, caseCode, decimal, fmtFechaDia, fmtFechaHora, fullName } from "@/lib/med/format";
import { getPatient } from "@/lib/server/case-queries";
import { hasPermission, requireUser } from "@/lib/server/dal";

export const metadata: Metadata = {
  title: "Paciente",
};

type Params = Promise<{ id: string }>;

export default function PatientPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<ListSkeleton rows={5} />}>
      <PatientSection params={params} />
    </Suspense>
  );
}

const v = (n: number | null, unit = "") => (n === null ? "—" : `${n}${unit}`);

async function PatientSection({ params }: { params: Params }) {
  const user = await requireUser();
  if (!hasPermission(user, PERMISSIONS.PATIENTS_READ)) return <NoAccess permission={PERMISSIONS.PATIENTS_READ} />;
  const { id } = await params;
  const p = await getPatient(id);
  if (!p) notFound();

  return (
    <>
      <Link href="/dashboard/pacientes" className="volver no-print">
        <Icon icon={cilArrowLeft} size="sm" /> Pacientes
      </Link>
      <PageHead
        eyebrow={p.vereda ? `${p.vereda}, ${p.municipality}` : p.municipality}
        title={fullName(p)}
        subtitle={`${ageText(p.birthDate)} · ${SEX_TXT[p.sex]} · ${p.documentType === "SD" ? "Sin documento" : `${DOCUMENT_TYPES[p.documentType]} ${p.documentNumber}`}`}
      />

      <div className="case-grid">
        <section className="card case-grid__main">
          <div className="card-body">
            <div className="card-title-row">
              <h2>Historial de atenciones</h2>
              <span className="small text-body-secondary">{p.cases.length} en total</span>
            </div>
            <div className="table-responsive">
              <table className="table table-med align-middle mb-0">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Pre-triaje</th>
                    <th>Motivo</th>
                    <th className="text-end">FR</th>
                    <th className="text-end">SpO₂</th>
                    <th className="text-end">PA</th>
                    <th className="text-end">FC</th>
                    <th className="text-end">T °C</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {p.cases.map((c) => (
                    <tr key={c.id}>
                      <td className="text-nowrap">
                        <Link href={`/dashboard/casos/${c.id}`} className="fw-semibold">
                          {fmtFechaHora(c.capturedAt)}
                        </Link>
                        <div className="small text-body-secondary">
                          {caseCode(c.number)} · {c.capturedBy.name}
                        </div>
                      </td>
                      <td>
                        <RiskBadge risk={c.riskLevel} score={c.news2Score} size="sm" />
                      </td>
                      <td className="motivo">{c.chiefComplaint}</td>
                      <td className="text-end num">{v(c.respiratoryRate)}</td>
                      <td className="text-end num">{v(c.spo2, " %")}</td>
                      <td className="text-end num">{c.systolicBp === null ? "—" : `${c.systolicBp}/${c.diastolicBp ?? "—"}`}</td>
                      <td className="text-end num">{v(c.heartRate)}</td>
                      <td className="text-end num">{c.temperature === null ? "—" : decimal(c.temperature)}</td>
                      <td>
                        <StatusBadge status={c.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
        <aside className="case-grid__side">
          <section className="card">
            <div className="card-body">
              <h2 className="card-title-sm">Datos del paciente</h2>
              <dl className="facts">
                <dt>Nacimiento</dt>
                <dd>{fmtFechaDia(p.birthDate)}</dd>
                <dt>Aseguradora</dt>
                <dd>{p.insurer ?? "Sin dato"}</dd>
                <dt>Teléfono</dt>
                <dd>{p.phone ?? "Sin dato"}</dd>
                <dt>Registrado</dt>
                <dd>{fmtFechaHora(p.createdAt)}</dd>
              </dl>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
