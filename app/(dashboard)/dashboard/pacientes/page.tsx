import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cilSearch } from "@coreui/icons";
import { NoAccess } from "@/components/admin/no-access";
import { AutoSubmitForm } from "@/components/med/auto-submit-form";
import { Icon } from "@/components/med/icon";
import { PageHead } from "@/components/med/page-head";
import { Pager, withQuery } from "@/components/med/pager";
import { RiskBadge } from "@/components/med/risk";
import { ListSkeleton } from "@/components/med/skeletons";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { SEX_TXT } from "@/lib/med/catalog";
import { ageText, fmtFecha, fullName } from "@/lib/med/format";
import { listPatients, parsePatientFilters } from "@/lib/server/case-queries";
import { hasPermission, requireUser } from "@/lib/server/dal";

export const metadata: Metadata = {
  title: "Pacientes",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function PatientsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHead eyebrow="Atención" title="Pacientes" subtitle="Personas atendidas en campo por los promotores. Se crean y actualizan con cada caso sincronizado." />
      <Suspense fallback={<ListSkeleton />}>
        <PatientsSection searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function PatientsSection({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  if (!hasPermission(user, PERMISSIONS.PATIENTS_READ)) return <NoAccess permission={PERMISSIONS.PATIENTS_READ} />;

  const f = parsePatientFilters(await searchParams);
  const { rows, total, pageCount, municipios } = await listPatients(f);
  const current = { q: f.q, municipio: f.municipio, pagina: f.page };

  return (
    <section className="card">
      <div className="card-body">
        <AutoSubmitForm action="/dashboard/pacientes" className="filter-bar">
          <div className="filter-bar__search">
            <Icon icon={cilSearch} />
            <input type="search" name="q" defaultValue={f.q} className="form-control" placeholder="Nombre, documento o vereda…" aria-label="Buscar pacientes" />
          </div>
          <select name="municipio" defaultValue={f.municipio} className="form-select" aria-label="Municipio">
            <option value="">Todos los municipios</option>
            {municipios.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </AutoSubmitForm>
        <p className="small text-body-secondary mb-2">
          {total} {total === 1 ? "paciente" : "pacientes"}
        </p>

        <div className="table-responsive">
          <table className="table table-med align-middle mb-0">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Documento</th>
                <th>Residencia</th>
                <th className="text-end">Atenciones</th>
                <th>Última atención</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const last = p.cases[0];
                return (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/dashboard/pacientes/${p.id}`} className="fw-semibold">
                        {fullName(p)}
                      </Link>
                      <div className="small text-body-secondary">
                        {ageText(p.birthDate)} · {SEX_TXT[p.sex]}
                      </div>
                    </td>
                    <td className="text-nowrap">{p.documentType === "SD" ? <span className="text-body-secondary">Sin documento</span> : `${p.documentType} ${p.documentNumber}`}</td>
                    <td>{p.vereda ? `${p.vereda}, ${p.municipality}` : p.municipality}</td>
                    <td className="text-end num">{p._count.cases}</td>
                    <td>
                      {last && (
                        <Link href={`/dashboard/casos/${last.id}`} className="d-inline-flex align-items-center gap-2 text-nowrap">
                          <RiskBadge risk={last.riskLevel} score={last.news2Score} size="sm" />
                          {fmtFecha(last.capturedAt)}
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!rows.length && (
                <tr>
                  <td colSpan={5} className="text-center text-body-secondary py-4">
                    No hay pacientes con estos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="d-flex justify-content-end mt-3">
          <Pager page={f.page} pageCount={pageCount} href={(p) => withQuery("/dashboard/pacientes", current, { pagina: p })} label="Paginación de pacientes" />
        </div>
      </div>
    </section>
  );
}
