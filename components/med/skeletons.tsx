/** Esqueletos de carga (renderizables en servidor) mientras llegan los datos de la sesión. */
export function PageSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div aria-busy="true" aria-label="Cargando…" className="placeholder-glow">
      <div className="mb-4">
        <span className="placeholder col-3 mb-2" style={{ height: "1.9rem" }} />
        <br />
        <span className="placeholder col-4" />
      </div>
      <div className="kpi-row">
        {Array.from({ length: cards }, (_, i) => (
          <span key={i} className="placeholder rounded" style={{ height: "6rem" }} />
        ))}
      </div>
      <div className="grid-main">
        <span className="placeholder rounded" style={{ height: "20rem" }} />
        <span className="placeholder rounded" style={{ height: "20rem" }} />
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="card placeholder-glow" aria-busy="true" aria-label="Cargando…">
      <div className="card-body d-grid gap-3">
        <span className="placeholder rounded" style={{ height: "2.5rem" }} />
        {Array.from({ length: rows }, (_, i) => (
          <span key={i} className="placeholder rounded" style={{ height: "3.75rem" }} />
        ))}
      </div>
    </div>
  );
}
