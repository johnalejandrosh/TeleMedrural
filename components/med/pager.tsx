import Link from "next/link";

/** Paginación con enlaces (renderizable en servidor). `href(page)` arma la URL de cada página. */
export function Pager({ page, pageCount, href, label }: { page: number; pageCount: number; href: (page: number) => string; label: string }) {
  if (pageCount <= 1) return null;
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter((p) => p === 1 || p === pageCount || Math.abs(p - page) <= 2);
  return (
    <nav aria-label={label}>
      <ul className="pagination mb-0">
        <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
          <Link className="page-link" href={href(page - 1)} aria-label="Anterior">
            ‹
          </Link>
        </li>
        {pages.map((p, i) => (
          <li key={p} className={`page-item ${p === page ? "active" : ""}`}>
            {i > 0 && pages[i - 1] !== p - 1 && <span className="page-gap">…</span>}
            <Link className="page-link" href={href(p)} aria-current={p === page ? "page" : undefined}>
              {p}
            </Link>
          </li>
        ))}
        <li className={`page-item ${page >= pageCount ? "disabled" : ""}`}>
          <Link className="page-link" href={href(page + 1)} aria-label="Siguiente">
            ›
          </Link>
        </li>
      </ul>
    </nav>
  );
}

/** Une los filtros actuales con cambios y devuelve la query (sin valores vacíos). */
export function withQuery(base: string, current: Record<string, string | number>, changes: Record<string, string | number | null>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...current, ...changes })) {
    if (v !== null && v !== "" && !(k === "pagina" && Number(v) === 1)) params.set(k, String(v));
  }
  const q = params.toString();
  return q ? `${base}?${q}` : base;
}
