/**
 * Recepción de los casos que la app móvil guardó sin conexión (POST /api/v1/casos).
 *
 * - Idempotente: el `clientId` lo genera el teléfono; si la app reintenta un lote que
 *   ya llegó (se cortó la señal antes de recibir la respuesta), no se duplica nada.
 * - Cada caso se valida y guarda por separado: uno con errores no bloquea el resto.
 * - El NEWS2 se recalcula aquí; el que informó la app se guarda para comparar.
 */
import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { computeNews2 } from "@/lib/med/news2";
import { caseSchema, firstIssue, type CaseInput } from "@/lib/validation/sync";
import { db } from "./db";
import { isUniqueViolation } from "./prisma-errors";

export type CaseResult =
  | { clientId: string; status: "created"; caseId: string; caseNumber: number; news2Score: number | null; riskLevel: string | null }
  | { clientId: string; status: "duplicate"; caseId: string; caseNumber: number }
  | { clientId: string | null; status: "rejected"; error: string };

type Tx = Prisma.TransactionClient;

/** Margen para relojes de teléfono adelantados. */
const FUTURE_TOLERANCE_MS = 15 * 60 * 1000;

async function upsertPatient(tx: Tx, input: CaseInput) {
  const p = input.patient;
  const data = {
    firstName: p.firstName,
    lastName: p.lastName,
    birthDate: new Date(`${p.birthDate}T00:00:00Z`),
    sex: p.sex,
    municipality: p.municipality ?? input.municipality,
    vereda: p.vereda ?? input.vereda,
  };
  const optional = { ...(p.phone && { phone: p.phone }), ...(p.insurer && { insurer: p.insurer }) };

  if (p.documentType !== "SD" && p.documentNumber) {
    return tx.patient.upsert({
      where: { documentType_documentNumber: { documentType: p.documentType, documentNumber: p.documentNumber } },
      update: { ...data, ...optional },
      create: { documentType: p.documentType, documentNumber: p.documentNumber, ...data, ...optional },
      select: { id: true },
    });
  }

  // Sin documento: se reconoce por nombre, fecha de nacimiento y municipio.
  const existing = await tx.patient.findFirst({
    where: {
      documentType: "SD",
      firstName: { equals: p.firstName, mode: "insensitive" },
      lastName: { equals: p.lastName, mode: "insensitive" },
      birthDate: data.birthDate,
      municipality: { equals: data.municipality, mode: "insensitive" },
    },
    select: { id: true },
  });
  if (existing) return existing;
  return tx.patient.create({ data: { documentType: "SD", documentNumber: null, ...data, ...optional }, select: { id: true } });
}

async function saveCase(input: CaseInput, userId: string, batchId: string): Promise<CaseResult> {
  const existing = await db.clinicalCase.findUnique({ where: { clientId: input.clientId }, select: { id: true, number: true, capturedById: true } });
  if (existing) {
    if (existing.capturedById !== userId) return { clientId: input.clientId, status: "rejected", error: "Ese clientId ya lo usa otro usuario." };
    return { clientId: input.clientId, status: "duplicate", caseId: existing.id, caseNumber: existing.number };
  }

  const capturedAt = new Date(input.capturedAt);
  if (capturedAt.getTime() > Date.now() + FUTURE_TOLERANCE_MS) {
    return { clientId: input.clientId, status: "rejected", error: "capturedAt está en el futuro: revise la hora del teléfono." };
  }

  const v = input.vitals;
  const news2 = computeNews2(v);
  const b = input.background;

  try {
    const created = await db.$transaction(async (tx) => {
      const patient = await upsertPatient(tx, input);
      return tx.clinicalCase.create({
        data: {
          clientId: input.clientId,
          patientId: patient.id,
          capturedById: userId,
          syncBatchId: batchId,
          capturedAt,
          municipality: input.municipality,
          vereda: input.vereda,
          latitude: input.location?.lat ?? null,
          longitude: input.location?.lon ?? null,
          chiefComplaint: input.chiefComplaint,
          symptoms: input.symptoms,
          symptomsNotes: input.symptomsNotes,
          onsetDays: input.onsetDays,
          conditions: b.conditions,
          allergies: b.allergies,
          medications: b.medications,
          pregnant: input.patient.sex === "M" ? null : b.pregnant,
          backgroundNotes: b.notes,
          respiratoryRate: v.respiratoryRate,
          spo2: v.spo2,
          spo2Scale2: v.spo2Scale2,
          supplementalO2: v.supplementalO2,
          systolicBp: v.systolicBp,
          diastolicBp: v.diastolicBp,
          heartRate: v.heartRate,
          consciousness: v.consciousness,
          temperature: v.temperature,
          glucose: v.glucose,
          weightKg: v.weightKg,
          news2Score: news2?.score ?? null,
          news2DeviceScore: input.triage?.news2Score ?? null,
          riskLevel: news2?.risk ?? null,
          news2Breakdown: news2 ? news2.breakdown : undefined,
          news2Incomplete: news2 ? news2.incomplete : true,
        },
        select: { id: true, number: true, news2Score: true, riskLevel: true },
      });
    });
    return { clientId: input.clientId, status: "created", caseId: created.id, caseNumber: created.number, news2Score: created.news2Score, riskLevel: created.riskLevel };
  } catch (error) {
    // Dos envíos simultáneos del mismo caso: el segundo choca con el índice único.
    if (isUniqueViolation(error)) {
      const again = await db.clinicalCase.findUnique({ where: { clientId: input.clientId }, select: { id: true, number: true } });
      if (again) return { clientId: input.clientId, status: "duplicate", caseId: again.id, caseNumber: again.number };
    }
    console.error("[sync] error al guardar el caso", input.clientId, error);
    return { clientId: input.clientId, status: "rejected", error: "Error interno al guardar el caso." };
  }
}

export async function ingestBatch(params: { userId: string; tokenId: string | null; appVersion: string | null; cases: unknown[] }) {
  const batch = await db.syncBatch.create({
    data: { userId: params.userId, tokenId: params.tokenId, appVersion: params.appVersion, received: params.cases.length },
    select: { id: true, receivedAt: true },
  });

  const results: CaseResult[] = [];
  for (const raw of params.cases) {
    const parsed = caseSchema.safeParse(raw);
    if (!parsed.success) {
      const clientId = typeof raw === "object" && raw && "clientId" in raw && typeof raw.clientId === "string" ? raw.clientId.slice(0, 64) : null;
      results.push({ clientId, status: "rejected", error: firstIssue(parsed.error) });
      continue;
    }
    results.push(await saveCase(parsed.data, params.userId, batch.id));
  }

  const count = (s: CaseResult["status"]) => results.filter((r) => r.status === s).length;
  const rejected = results.filter((r) => r.status === "rejected");
  await db.syncBatch.update({
    where: { id: batch.id },
    data: {
      created: count("created"),
      duplicated: count("duplicate"),
      rejected: rejected.length,
      errors: rejected.length ? rejected.map((r) => ({ clientId: r.clientId, error: r.status === "rejected" ? r.error : "" })) : undefined,
    },
  });

  return { batchId: batch.id, receivedAt: batch.receivedAt.toISOString(), results };
}
