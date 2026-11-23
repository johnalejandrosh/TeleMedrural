/**
 * Pre-triaje con la escala NEWS2 (National Early Warning Score 2, Royal College of
 * Physicians, 2017). Son las mismas reglas que aplica la app móvil sin conexión; la
 * plataforma recalcula el puntaje al recibir cada caso para no depender de la versión
 * de la app.
 *
 * Sin dependencias de servidor: lo usan el seed, la API, las páginas y el cliente.
 */

export type Acvpu = "A" | "C" | "V" | "P" | "U";
export type Risk = "LOW" | "LOW_MEDIUM" | "MEDIUM" | "HIGH";

export type Vitals = {
  respiratoryRate?: number | null;
  spo2?: number | null;
  /** Escala 2 de SpO₂: pacientes con insuficiencia respiratoria hipercápnica (p. ej. EPOC). */
  spo2Scale2?: boolean | null;
  supplementalO2?: boolean | null;
  systolicBp?: number | null;
  heartRate?: number | null;
  consciousness?: Acvpu | null;
  temperature?: number | null;
};

export const NEWS2_PARAMS = ["respiratoryRate", "spo2", "supplementalO2", "systolicBp", "heartRate", "consciousness", "temperature"] as const;
export type News2Param = (typeof NEWS2_PARAMS)[number];

export type News2Result = {
  /** Suma de los parámetros disponibles. */
  score: number;
  risk: Risk;
  /** Puntaje de cada parámetro; `null` si el dato no se tomó. */
  breakdown: Record<News2Param, number | null>;
  /** Algún parámetro llegó en 3 (respuesta urgente aunque el total sea bajo). */
  redFlag: boolean;
  /** Faltan datos: el total puede estar subestimado. */
  incomplete: boolean;
  missing: News2Param[];
};

const has = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);

export function scoreRespiratoryRate(v: number) {
  if (v <= 8) return 3;
  if (v <= 11) return 1;
  if (v <= 20) return 0;
  if (v <= 24) return 2;
  return 3;
}

export function scoreSpo2(v: number, scale2: boolean, onOxygen: boolean) {
  if (!scale2) {
    if (v <= 91) return 3;
    if (v <= 93) return 2;
    if (v <= 95) return 1;
    return 0;
  }
  // Escala 2: meta 88–92 %. Por encima de 92 solo puntúa si recibe oxígeno.
  if (v <= 83) return 3;
  if (v <= 85) return 2;
  if (v <= 87) return 1;
  if (v <= 92 || !onOxygen) return 0;
  if (v <= 94) return 1;
  if (v <= 96) return 2;
  return 3;
}

export function scoreSystolic(v: number) {
  if (v <= 90) return 3;
  if (v <= 100) return 2;
  if (v <= 110) return 1;
  if (v <= 219) return 0;
  return 3;
}

export function scoreHeartRate(v: number) {
  if (v <= 40) return 3;
  if (v <= 50) return 1;
  if (v <= 90) return 0;
  if (v <= 110) return 1;
  if (v <= 130) return 2;
  return 3;
}

export function scoreTemperature(v: number) {
  // Los cortes del RCP van con un decimal (35,0 / 36,0 / 38,0 / 39,0).
  const t = Math.round(v * 10) / 10;
  if (t <= 35) return 3;
  if (t <= 36) return 1;
  if (t <= 38) return 0;
  if (t <= 39) return 1;
  return 2;
}

export function riskFor(score: number, redFlag: boolean): Risk {
  if (score >= 7) return "HIGH";
  if (score >= 5) return "MEDIUM";
  if (redFlag) return "LOW_MEDIUM";
  return "LOW";
}

export function computeNews2(v: Vitals): News2Result | null {
  const breakdown: Record<News2Param, number | null> = {
    respiratoryRate: has(v.respiratoryRate) ? scoreRespiratoryRate(v.respiratoryRate) : null,
    spo2: has(v.spo2) ? scoreSpo2(v.spo2, Boolean(v.spo2Scale2), Boolean(v.supplementalO2)) : null,
    supplementalO2: typeof v.supplementalO2 === "boolean" ? (v.supplementalO2 ? 2 : 0) : null,
    systolicBp: has(v.systolicBp) ? scoreSystolic(v.systolicBp) : null,
    heartRate: has(v.heartRate) ? scoreHeartRate(v.heartRate) : null,
    consciousness: v.consciousness ? (v.consciousness === "A" ? 0 : 3) : null,
    temperature: has(v.temperature) ? scoreTemperature(v.temperature) : null,
  };
  const missing = NEWS2_PARAMS.filter((p) => breakdown[p] === null);
  // Sin ningún signo vital tomado no hay pre-triaje (el aire/oxígeno solo no basta).
  if (missing.filter((p) => p !== "supplementalO2").length === NEWS2_PARAMS.length - 1) return null;

  const values = Object.values(breakdown).filter((s): s is number => s !== null);
  const score = values.reduce((a, b) => a + b, 0);
  const redFlag = values.some((s) => s === 3);
  return { score, risk: riskFor(score, redFlag), breakdown, redFlag, incomplete: missing.length > 0, missing };
}

/** Orden de atención: el más grave primero. */
export const RISK_ORDER: Risk[] = ["HIGH", "MEDIUM", "LOW_MEDIUM", "LOW"];

export const RISK_INFO: Record<Risk, { label: string; short: string; range: string; response: string; tone: string }> = {
  HIGH: {
    label: "Riesgo alto",
    short: "Alto",
    range: "7 o más",
    response: "Emergencia: valoración inmediata y gestión de traslado.",
    tone: "critico",
  },
  MEDIUM: {
    label: "Riesgo medio",
    short: "Medio",
    range: "5 – 6",
    response: "Urgente: revisión por un profesional en menos de una hora.",
    tone: "alto",
  },
  LOW_MEDIUM: {
    label: "Riesgo bajo-medio",
    short: "Bajo-medio",
    range: "Un parámetro en 3",
    response: "Revisión urgente del parámetro alterado por un profesional.",
    tone: "medio",
  },
  LOW: {
    label: "Riesgo bajo",
    short: "Bajo",
    range: "0 – 4",
    response: "Seguimiento de rutina por el promotor de salud.",
    tone: "bajo",
  },
};

/** Etiquetas y tabla de referencia de cada parámetro (página «Escala NEWS2» y detalle del caso). */
export const PARAM_INFO: Record<News2Param, { label: string; unit?: string; bands: [string, string, string, string, string, string, string] }> = {
  // Columnas: 3 | 2 | 1 | 0 | 1 | 2 | 3
  respiratoryRate: { label: "Frecuencia respiratoria", unit: "rpm", bands: ["≤ 8", "", "9 – 11", "12 – 20", "", "21 – 24", "≥ 25"] },
  spo2: { label: "SpO₂ escala 1", unit: "%", bands: ["≤ 91", "92 – 93", "94 – 95", "≥ 96", "", "", ""] },
  supplementalO2: { label: "¿Aire u oxígeno?", bands: ["", "Oxígeno", "", "Aire", "", "", ""] },
  systolicBp: { label: "Presión sistólica", unit: "mmHg", bands: ["≤ 90", "91 – 100", "101 – 110", "111 – 219", "", "", "≥ 220"] },
  heartRate: { label: "Pulso", unit: "lpm", bands: ["≤ 40", "", "41 – 50", "51 – 90", "91 – 110", "111 – 130", "≥ 131"] },
  consciousness: { label: "Conciencia (ACVPU)", bands: ["", "", "", "Alerta", "", "", "C, V, P o U"] },
  temperature: { label: "Temperatura", unit: "°C", bands: ["≤ 35,0", "", "35,1 – 36,0", "36,1 – 38,0", "38,1 – 39,0", "≥ 39,1", ""] },
};

export const SPO2_SCALE2_BANDS = ["≤ 83", "84 – 85", "86 – 87", "88 – 92 · ≥ 93 con aire", "93 – 94 con O₂", "95 – 96 con O₂", "≥ 97 con O₂"];

export const ACVPU_TXT: Record<Acvpu, string> = {
  A: "Alerta",
  C: "Confusión nueva",
  V: "Responde a la voz",
  P: "Responde al dolor",
  U: "No responde",
};
