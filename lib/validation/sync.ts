/**
 * Contrato de la API que usa la app móvil (POST /api/v1/casos). Cada caso se valida
 * por separado: un caso con errores se rechaza sin afectar a los demás del lote.
 */
import { z } from "zod";

export const MAX_CASES_PER_BATCH = 100;

const text = (max: number) => z.string().trim().min(1).max(max);
const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);

/** Entero o decimal dentro de un rango fisiológicamente posible (descarta errores de digitación). */
const intIn = (min: number, max: number) => z.number().int().min(min).max(max).nullish().transform((v) => v ?? null);
const numIn = (min: number, max: number) => z.number().min(min).max(max).nullish().transform((v) => v ?? null);

const keyList = z
  .array(z.string().trim().toLowerCase().regex(/^[a-z0-9_]{2,60}$/))
  .max(40)
  .default([])
  .transform((list) => [...new Set(list)]);

export const patientSchema = z
  .object({
    documentType: z.enum(["CC", "TI", "RC", "CE", "PPT", "PA", "SD"]),
    documentNumber: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9-]{3,30}$/, { error: "Número de documento inválido." })
      .nullish()
      .transform((v) => v || null),
    firstName: text(80),
    lastName: text(80),
    birthDate: z.iso.date(),
    sex: z.enum(["F", "M", "I"]),
    phone: optText(30),
    insurer: optText(80),
    municipality: optText(80),
    vereda: optText(120),
  })
  .refine((p) => p.documentType === "SD" || p.documentNumber, { error: "Falta el número de documento.", path: ["documentNumber"] })
  .refine((p) => new Date(p.birthDate) <= new Date() && new Date(p.birthDate).getUTCFullYear() >= 1900, {
    error: "Fecha de nacimiento fuera de rango.",
    path: ["birthDate"],
  });

export const vitalsSchema = z
  .object({
    respiratoryRate: intIn(0, 80),
    spo2: intIn(50, 100),
    spo2Scale2: z.boolean().default(false),
    supplementalO2: z.boolean().default(false),
    systolicBp: intIn(40, 300),
    diastolicBp: intIn(20, 200),
    heartRate: intIn(20, 250),
    consciousness: z.enum(["A", "C", "V", "P", "U"]).nullish().transform((v) => v ?? null),
    temperature: numIn(30, 45),
    glucose: intIn(10, 1000),
    weightKg: numIn(0.3, 400),
  })
  .prefault({});

export const caseSchema = z.object({
  /** UUID que genera el teléfono al crear la ficha. */
  clientId: z.string().trim().regex(/^[A-Za-z0-9_-]{8,64}$/, { error: "clientId inválido (8–64 caracteres: letras, números, - o _)." }),
  capturedAt: z.iso.datetime({ offset: true }),
  municipality: text(80),
  vereda: optText(120),
  location: z
    .object({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) })
    .nullish()
    .transform((v) => v ?? null),
  patient: patientSchema,
  chiefComplaint: text(500),
  symptoms: keyList,
  symptomsNotes: optText(2000),
  onsetDays: intIn(0, 3650),
  background: z
    .object({
      conditions: keyList,
      allergies: optText(500),
      medications: optText(1000),
      pregnant: z.boolean().nullish().transform((v) => v ?? null),
      notes: optText(2000),
    })
    .prefault({}),
  vitals: vitalsSchema,
  /** Lo que calculó la app (opcional): la plataforma recalcula y guarda ambos. */
  triage: z
    .object({ news2Score: z.number().int().min(0).max(20).nullish() })
    .nullish()
    .transform((v) => v ?? null),
});

export type CaseInput = z.infer<typeof caseSchema>;

export const batchSchema = z.object({
  appVersion: z.string().trim().max(40).nullish(),
  cases: z.array(z.unknown()).min(1, { error: "El lote no trae casos." }).max(MAX_CASES_PER_BATCH, { error: `Máximo ${MAX_CASES_PER_BATCH} casos por lote.` }),
});

export const tokenRequestSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(200),
  deviceName: z.string().trim().min(2).max(120).default("Dispositivo sin nombre"),
});

/** Primer error legible de Zod ("patient.birthDate: Fecha de nacimiento fuera de rango"). */
export function firstIssue(error: z.ZodError) {
  const issue = error.issues[0];
  if (!issue) return "Datos inválidos.";
  const path = issue.path.join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}
