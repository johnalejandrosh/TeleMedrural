"use client";

import { CFooter } from "@coreui/react";

export function AppFooter() {
  return (
    <CFooter className="app-footer px-3 px-lg-4 no-print">
      <span>TeleMed Rural · MVP v0.1</span>
      <span className="ms-auto text-end">
        Pre-triaje con NEWS2 (Royal College of Physicians, 2017) · Apoya, no reemplaza, el criterio clínico
      </span>
    </CFooter>
  );
}
