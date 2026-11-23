import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cilSearch } from "@coreui/icons";
import { NoAccess } from "@/components/admin/no-access";
import { AutoSubmitForm } from "@/components/med/auto-submit-form";
import { CaseListItem } from "@/components/med/case-list";
import { Icon } from "@/components/med/icon";
import { PageHead } from "@/components/med/page-head";
import { Pager, withQuery } from "@/components/med/pager";
import { RiskLegend } from "@/components/med/risk";
import { ListSkeleton } from "@/components/med/skeletons";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { nowMs } from "@/lib/med/format";
import { RISK_INFO } from "@/lib/med/news2";
import { caseFilterOptions, caseScope, listCases, parseCaseFilters, pendingByRisk } from "@/lib/server/case-queries";
import { hasPermission, requireUser } from "@/lib/server/dal";

export const metadata: Metadata = {
  title: "Bandeja de casos",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function CasesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <CasesSection searchParams={searchParams} />
    </Suspense>
  );
}

const STRIP = [
  ["alto", RISK_INFO.HIGH.short, "HIGH"],
  ["medio", RISK_INFO.MEDIUM.short, "MEDIUM"],
  ["bajo-medio", RISK_INFO.LOW_MEDIUM.short, "LOW_MEDIUM"],
  ["bajo", RISK_INFO.LOW.short, "LOW"],
  ["sin", "Sin signos", "NONE"],
] as const;

const CHIPS = [["", "Todos"], ...STRIP] as const;

async function CasesSection({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const scope = caseScope(user);
  if (!scope) return <NoAccess permission={PERMISSIONS.CASES_READ} />;

  const reviewer = hasPermission(user, PERMISSIONS.CASES_REVIEW);
  const filters = parseCaseFilters(await searchParams, reviewer ? "pendiente" : "todos");
  const [{ rows, total, pageCount }, counts, options] = await Promise.all([listCases(scope, filters), pendingByRisk(scope), caseFilterOptions(scope)]);
  const own = !hasPermission(user, PERMISSIONS.CASES_READ);
  const now = nowMs();
  const current = { q: filters.q, estado: filters.estado, riesgo: filters.riesgo, municipio: filters.municipio, promotor: filters.promotor, pagina: filters.page };
  const href = (changes: Record<string, string | number | null>) => withQuery("/dashboard/casos", current, { pagina: null, ...changes });
  const totalPending = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <>
      <PageHead
        eyebrow={own ? "Mis casos" : "Telemedicina diferida"}
        title="Bandeja de casos"
        subtitle={
          own
            ? "Los casos que usted registró en la app y el concepto del personal de salud."
            : `${totalPending} ${totalPending === 1 ? "caso pendiente" : "casos pendientes"} de revisión. Primero los de mayor riesgo y, a igual riesgo, los que más llevan esperando.`
        }
      />

      <div className="triage-strip" role="list" aria-label="Pendientes por nivel de riesgo">
        {STRIP.map(([param, text, key]) => (
          <Link
            key={param}
            role="listitem"
            href={href({ riesgo: filters.riesgo === param ? "" : param, estado: "pendiente" })}
            className={`triage-chip triage-chip--${key === "NONE" ? "sin" : RISK_INFO[key].tone} ${filters.riesgo === param ? "is-active" : ""}`}
            aria-current={filters.riesgo === param ? "true" : undefined}
          >
            <b>{counts[key]}</b>
            <span>{text}</span>
          </Link>
        ))}
      </div>

      <section className="card">
        <div className="card-body">
          <AutoSubmitForm action="/dashboard/casos" className="filter-bar">
            <div className="filter-bar__search">
              <Icon icon={cilSearch} />
              <input
                type="search"
                name="q"
                defaultValue={filters.q}
                className="form-control"
                placeholder="Paciente, documento, vereda, motivo o código TMR…"
                aria-label="Buscar casos"
              />
            </div>
            <select name="estado" defaultValue={filters.estado} className="form-select" aria-label="Estado">
              <option value="pendiente">Pendientes</option>
              <option value="revisado">Revisados</option>
              <option value="todos">Todos los estados</option>
            </select>
            <select name="riesgo" defaultValue={filters.riesgo} className="form-select" aria-label="Riesgo">
              {CHIPS.map(([param, text]) => (
                <option key={param} value={param}>
                  {param ? `Riesgo ${text.toLowerCase()}` : "Todo riesgo"}
                </option>
              ))}
              <option value="urgente">Alto y medio</option>
            </select>
            <select name="municipio" defaultValue={filters.municipio} className="form-select" aria-label="Municipio">
              <option value="">Todos los municipios</option>
              {options.municipios.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            {!own && (
              <select name="promotor" defaultValue={filters.promotor} className="form-select" aria-label="Promotor">
                <option value="">Todos los promotores</option>
                {options.promotores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </AutoSubmitForm>

          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2 small text-body-secondary">
            <span>
              {total} {total === 1 ? "caso" : "casos"}
              {filters.q && ` que coinciden con «${filters.q}»`}
            </span>
            {(filters.q || filters.riesgo || filters.municipio || filters.promotor) && <Link href={href({ q: "", riesgo: "", municipio: "", promotor: "" })}>Quitar filtros</Link>}
          </div>

          {rows.length ? (
            <div className="case-list">
              {rows.map((c) => (
                <CaseListItem key={c.id} c={c} now={now} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h2 className="h6">{filters.estado === "pendiente" ? "No hay casos pendientes con estos filtros" : "No hay casos con estos filtros"}</h2>
              <p className="text-body-secondary mb-0">
                {filters.estado === "pendiente" ? "Cuando un promotor sincronice nuevas fichas aparecerán aquí, ordenadas por prioridad." : "Pruebe con otros filtros."}
              </p>
            </div>
          )}

          <div className="d-flex justify-content-end mt-3">
            <Pager page={filters.page} pageCount={pageCount} href={(p) => withQuery("/dashboard/casos", current, { pagina: p })} label="Paginación de casos" />
          </div>
        </div>
      </section>
      <RiskLegend />
    </>
  );
}
