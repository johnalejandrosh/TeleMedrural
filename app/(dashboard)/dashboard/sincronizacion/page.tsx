import type { Metadata } from "next";
import { Suspense } from "react";
import { NoAccess } from "@/components/admin/no-access";
import { PageHead } from "@/components/med/page-head";
import { RevokeButton } from "@/components/med/revoke-button";
import { ListSkeleton } from "@/components/med/skeletons";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { fmtFechaHora, hace, nowMs } from "@/lib/med/format";
import { getSyncOverview } from "@/lib/server/case-queries";
import { hasPermission, requireUser } from "@/lib/server/dal";

export const metadata: Metadata = {
  title: "Sincronización",
};

export default function SyncPage() {
  return (
    <>
      <PageHead
        eyebrow="Administración"
        title="Sincronización"
        subtitle="Lotes que envía la app móvil al recuperar la señal y dispositivos con acceso a la plataforma."
      />
      <Suspense fallback={<ListSkeleton />}>
        <SyncSection />
      </Suspense>
    </>
  );
}

type BatchError = { clientId: string | null; error: string };

async function SyncSection() {
  const user = await requireUser();
  if (!hasPermission(user, PERMISSIONS.SYNC_READ)) return <NoAccess permission={PERMISSIONS.SYNC_READ} />;
  const canManage = hasPermission(user, PERMISSIONS.SYNC_MANAGE);
  const { batches, tokens, totals } = await getSyncOverview();
  const now = nowMs();
  const s = totals._sum;

  return (
    <div className="d-grid gap-4">
      <div className="kpi-row">
        {[
          ["Lotes (30 días)", totals._count._all, ""],
          ["Casos nuevos", s.created ?? 0, "c2"],
          ["Reintentos sin duplicar", s.duplicated ?? 0, "c3"],
          ["Rechazados", s.rejected ?? 0, "c4"],
        ].map(([label, value, c]) => (
          <div key={label} className="card stat stat--plain">
            <div className="card-body">
              <span className="stat__label">{label}</span>
              <b className={`stat__value ${c === "c4" && Number(value) > 0 ? "text-danger" : ""}`}>{value}</b>
            </div>
          </div>
        ))}
      </div>

      <section className="card">
        <div className="card-body">
          <div className="card-title-row">
            <h2>Últimos lotes recibidos</h2>
          </div>
          <div className="table-responsive">
            <table className="table table-med align-middle mb-0">
              <thead>
                <tr>
                  <th>Recibido</th>
                  <th>Promotor · dispositivo</th>
                  <th className="text-end">Casos</th>
                  <th className="text-end">Nuevos</th>
                  <th className="text-end">Repetidos</th>
                  <th className="text-end">Rechazados</th>
                  <th>App</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => {
                  const errors = (b.errors ?? []) as BatchError[];
                  return (
                    <tr key={b.id}>
                      <td className="text-nowrap">
                        {fmtFechaHora(b.receivedAt)}
                        <div className="small text-body-secondary">{hace(b.receivedAt, now)}</div>
                      </td>
                      <td>
                        {b.user.name}
                        <div className="small text-body-secondary">{b.token?.deviceName ?? "Dispositivo revocado"}</div>
                      </td>
                      <td className="text-end num">{b.received}</td>
                      <td className="text-end num">{b.created}</td>
                      <td className="text-end num">{b.duplicated}</td>
                      <td className="text-end num">
                        {b.rejected ? (
                          <details className="sync-errors">
                            <summary className="text-danger fw-semibold">{b.rejected}</summary>
                            <ul>
                              {errors.map((e, i) => (
                                <li key={i}>
                                  <code>{e.clientId ?? "sin clientId"}</code> {e.error}
                                </li>
                              ))}
                            </ul>
                          </details>
                        ) : (
                          0
                        )}
                      </td>
                      <td className="small text-body-secondary">{b.appVersion ?? "—"}</td>
                    </tr>
                  );
                })}
                {!batches.length && (
                  <tr>
                    <td colSpan={7} className="text-center text-body-secondary py-4">
                      Todavía no ha llegado ningún lote desde la app.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-body">
          <div className="card-title-row">
            <h2>Dispositivos</h2>
            <span className="small text-body-secondary">El token de la app dura 90 días</span>
          </div>
          <div className="table-responsive">
            <table className="table table-med align-middle mb-0">
              <thead>
                <tr>
                  <th>Dispositivo</th>
                  <th>Usuario</th>
                  <th>Último uso</th>
                  <th className="text-end">Lotes</th>
                  <th>Estado</th>
                  {canManage && <th aria-label="Acciones" />}
                </tr>
              </thead>
              <tbody>
                {tokens.map((t) => {
                  const expired = t.expiresAt.getTime() <= now;
                  return (
                    <tr key={t.id} className={t.revokedAt || expired ? "text-body-secondary" : ""}>
                      <td>{t.deviceName}</td>
                      <td>
                        {t.user.name}
                        <div className="small text-body-secondary">{t.user.role.name}</div>
                      </td>
                      <td className="text-nowrap">{t.lastUsedAt ? hace(t.lastUsedAt, now) : "Nunca"}</td>
                      <td className="text-end num">{t._count.batches}</td>
                      <td>
                        {t.revokedAt ? (
                          <span className="status-badge status-badge--off">Revocado</span>
                        ) : expired ? (
                          <span className="status-badge status-badge--off">Vencido</span>
                        ) : (
                          <span className="status-badge status-badge--reviewed">Activo · vence {fmtFechaHora(t.expiresAt).split(",")[0]}</span>
                        )}
                      </td>
                      {canManage && <td className="text-end">{!t.revokedAt && !expired && <RevokeButton id={t.id} device={t.deviceName} owner={t.user.name} />}</td>}
                    </tr>
                  );
                })}
                {!tokens.length && (
                  <tr>
                    <td colSpan={6} className="text-center text-body-secondary py-4">
                      Ningún dispositivo ha iniciado sesión todavía.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
