"use client";

import CIcon from "@coreui/icons-react";
import { cilCloudUpload, cilNotes, cilWarning } from "@coreui/icons";
import { Logo } from "@/components/brand/logo";

const FEATURES = [
  { icon: cilCloudUpload, text: "El promotor registra el caso sin señal y la app lo envía al recuperar la cobertura" },
  { icon: cilWarning, text: "Pre-triaje automático con la escala NEWS2 para atender primero lo más grave" },
  { icon: cilNotes, text: "El profesional revisa la ficha y deja su concepto y la conducta a seguir" },
];

/** Panel de marca de las pantallas de acceso (solo escritorio). */
export function AuthAside() {
  return (
    <aside className="auth-aside">
      <div className="d-flex align-items-center gap-2">
        <Logo size={36} inverted />
      </div>

      <div>
        <h2 className="auth-aside__title">La consulta llega aunque la señal no.</h2>
        <p className="auth-aside__lead mb-0">
          TeleMed Rural conecta a los promotores de salud de las veredas con el personal médico: cada ficha clínica llega con sus signos vitales y una prioridad
          calculada, para revisarla de forma diferida.
        </p>
        <ul className="auth-features">
          {FEATURES.map((feature) => (
            <li key={feature.text}>
              <span className="auth-features__icon">
                <CIcon icon={feature.icon} />
              </span>
              {feature.text}
            </li>
          ))}
        </ul>
      </div>

      {/* Vista previa ilustrativa de un caso (decorativa). */}
      <div className="auth-preview auth-preview--case" aria-hidden="true">
        <div className="auth-preview__row">
          <span className="auth-preview__label">TMR-000128 · Vereda La Esperanza</span>
          <span className="auth-preview__badge">NEWS2 7 · Alto</span>
        </div>
        <div className="auth-preview__value">Fiebre y dificultad para respirar</div>
        <div className="auth-preview__vitals">
          <span>FR 26</span>
          <span>SpO₂ 90 %</span>
          <span>FC 118</span>
          <span>T 38,9 °C</span>
        </div>
        <svg className="auth-preview__ecg" viewBox="0 0 240 36" preserveAspectRatio="none">
          <path d="M0 20h60l8-14 12 28 9-20 6 6h30l8-14 12 28 9-20 6 6h80" fill="none" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </div>
    </aside>
  );
}
