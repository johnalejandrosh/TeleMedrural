import type { ReactNode } from "react";

/** Encabezado de página con acciones a la derecha (patrón de la plantilla). */
export function PageHead({ eyebrow, title, subtitle, children }: { eyebrow?: string; title: ReactNode; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <header className="page-head">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-0">{eyebrow}</p>}
        <h1>{title}</h1>
        {subtitle && <p className="text-body-secondary mb-0">{subtitle}</p>}
      </div>
      {children && <div className="page-head__actions no-print">{children}</div>}
    </header>
  );
}
