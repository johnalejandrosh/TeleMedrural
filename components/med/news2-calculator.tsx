"use client";

import { useState } from "react";
import { ACVPU_TXT, computeNews2, RISK_INFO, type Acvpu, type Vitals } from "@/lib/med/news2";
import { RiskBadge } from "./risk";

const NUM_FIELDS = [
  ["respiratoryRate", "Frecuencia respiratoria", "rpm"],
  ["spo2", "SpO₂", "%"],
  ["systolicBp", "Presión sistólica", "mmHg"],
  ["heartRate", "Pulso", "lpm"],
  ["temperature", "Temperatura", "°C"],
] as const;

/** Calculadora con las mismas reglas que la app y la plataforma (lib/med/news2.ts). */
export function News2Calculator() {
  const [v, setV] = useState<Vitals>({ respiratoryRate: 18, spo2: 97, systolicBp: 122, heartRate: 78, temperature: 36.8, consciousness: "A", supplementalO2: false, spo2Scale2: false });
  const result = computeNews2(v);
  const set = (patch: Partial<Vitals>) => setV((prev) => ({ ...prev, ...patch }));

  return (
    <div className="calc">
      <div className="calc__fields">
        {NUM_FIELDS.map(([key, label, unit]) => (
          <label key={key} className="calc__field">
            <span>{label}</span>
            <span className="input-group input-group-sm">
              <input
                type="number"
                inputMode="decimal"
                step={key === "temperature" ? 0.1 : 1}
                className="form-control"
                value={v[key] ?? ""}
                onChange={(e) => set({ [key]: e.target.value === "" ? null : Number(e.target.value) })}
              />
              <span className="input-group-text">{unit}</span>
            </span>
          </label>
        ))}
        <label className="calc__field">
          <span>Conciencia (ACVPU)</span>
          <select className="form-select form-select-sm" value={v.consciousness ?? ""} onChange={(e) => set({ consciousness: (e.target.value || null) as Acvpu | null })}>
            {(Object.keys(ACVPU_TXT) as Acvpu[]).map((k) => (
              <option key={k} value={k}>
                {k} · {ACVPU_TXT[k]}
              </option>
            ))}
          </select>
        </label>
        <div className="calc__checks">
          <div className="form-check form-switch">
            <input id="calc-o2" className="form-check-input" type="checkbox" checked={Boolean(v.supplementalO2)} onChange={(e) => set({ supplementalO2: e.target.checked })} />
            <label className="form-check-label" htmlFor="calc-o2">
              Recibe oxígeno
            </label>
          </div>
          <div className="form-check form-switch">
            <input id="calc-s2" className="form-check-input" type="checkbox" checked={Boolean(v.spo2Scale2)} onChange={(e) => set({ spo2Scale2: e.target.checked })} />
            <label className="form-check-label" htmlFor="calc-s2">
              Escala 2 de SpO₂ (EPOC)
            </label>
          </div>
        </div>
      </div>
      <div className="calc__result" aria-live="polite">
        {result ? (
          <>
            <span className="calc__score">{result.score}</span>
            <RiskBadge risk={result.risk} size="lg" />
            <p className="mb-0 mt-2">{RISK_INFO[result.risk].response}</p>
            {result.incomplete && <p className="small text-body-secondary mb-0 mt-1">Faltan datos: puntaje parcial.</p>}
          </>
        ) : (
          <p className="mb-0 text-body-secondary">Ingrese al menos un signo vital.</p>
        )}
      </div>
    </div>
  );
}
