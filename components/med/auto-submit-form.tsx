"use client";

import Form from "next/form";
import type { ReactNode } from "react";

/** Formulario GET de filtros: los selects se aplican al cambiar; el buscador con Enter. */
export function AutoSubmitForm({ action, children, className }: { action: string; children: ReactNode; className?: string }) {
  return (
    <Form
      action={action}
      className={className}
      role="search"
      onChange={(event) => {
        if (event.target instanceof HTMLSelectElement) event.currentTarget.requestSubmit();
      }}
    >
      {children}
    </Form>
  );
}
