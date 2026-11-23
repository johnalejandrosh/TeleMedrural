import { decimal } from "@/lib/med/format";
import { ACVPU_TXT, PARAM_INFO, type Acvpu, type News2Param } from "@/lib/med/news2";

type VitalsSource = {
  respiratoryRate: number | null;
  spo2: number | null;
  spo2Scale2: boolean;
  supplementalO2: boolean;
  systolicBp: number | null;
  diastolicBp: number | null;
  heartRate: number | null;
  consciousness: Acvpu | null;
  temperature: number | null;
  glucose: number | null;
  weightKg: number | null;
};

/** Color del puntaje parcial de cada parámetro (0 normal · 1 · 2 · 3 alterado). */
const subTone = (s: number | null | undefined) => (s === null || s === undefined ? "sin" : s === 0 ? "bajo" : s === 1 ? "medio" : s === 2 ? "alto" : "critico");

function Vital({ label, value, unit, score, hint }: { label: string; value: string | null; unit?: string; score?: number | null; hint?: string }) {
  return (
    <div className={`vital vital--${value === null ? "sin" : subTone(score)}`}>
      <span className="vital__label">{label}</span>
      <span className="vital__value">
        {value ?? "—"}
        {value !== null && unit && <small>{unit}</small>}
      </span>
      <span className="vital__foot">
        {score !== undefined && (
          <span className="vital__score" title="Puntos NEWS2 de este parámetro">
            {score === null ? "No tomado" : `${score} ${score === 1 ? "punto" : "puntos"}`}
          </span>
        )}
        {hint && <span className="vital__hint">{hint}</span>}
      </span>
    </div>
  );
}

/** Rejilla de signos vitales con el aporte de cada uno al NEWS2. */
export function VitalsPanel({ c, breakdown }: { c: VitalsSource; breakdown: Record<News2Param, number | null> | null }) {
  const b = (k: News2Param) => (breakdown ? breakdown[k] : null);
  const n = (v: number | null) => (v === null ? null : String(v));
  return (
    <div className="vitals">
      <Vital label={PARAM_INFO.respiratoryRate.label} value={n(c.respiratoryRate)} unit="rpm" score={b("respiratoryRate")} />
      <Vital label={c.spo2Scale2 ? "SpO₂ (escala 2)" : "Saturación SpO₂"} value={n(c.spo2)} unit="%" score={b("spo2")} hint={c.spo2Scale2 ? "Meta 88–92 %" : undefined} />
      <Vital label="Aire u oxígeno" value={c.supplementalO2 ? "Oxígeno" : "Aire"} score={b("supplementalO2")} />
      <Vital
        label="Presión arterial"
        value={c.systolicBp === null ? null : `${c.systolicBp}${c.diastolicBp !== null ? `/${c.diastolicBp}` : ""}`}
        unit="mmHg"
        score={b("systolicBp")}
        hint="Puntúa la sistólica"
      />
      <Vital label="Pulso" value={n(c.heartRate)} unit="lpm" score={b("heartRate")} />
      <Vital label="Conciencia" value={c.consciousness ? ACVPU_TXT[c.consciousness] : null} score={b("consciousness")} hint={c.consciousness ? `ACVPU: ${c.consciousness}` : undefined} />
      <Vital label="Temperatura" value={c.temperature === null ? null : decimal(c.temperature)} unit="°C" score={b("temperature")} />
      {(c.glucose !== null || c.weightKg !== null) && (
        <>
          {c.glucose !== null && <Vital label="Glucometría" value={String(c.glucose)} unit="mg/dL" hint="No entra en NEWS2" />}
          {c.weightKg !== null && <Vital label="Peso" value={decimal(c.weightKg)} unit="kg" hint="No entra en NEWS2" />}
        </>
      )}
    </div>
  );
}
