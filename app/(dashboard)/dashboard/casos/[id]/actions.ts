"use server";

import { refresh } from "next/cache";
import type { ActionResult } from "@/lib/actions";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorize } from "@/lib/server/dal";
import { db } from "@/lib/server/db";
import { fieldErrorsOf } from "@/lib/validation/admin";
import { noteSchema } from "@/lib/validation/med";

export type NoteField = "body" | "carePlan";

/** Registra la observación del profesional y, si lo indica, marca el caso como revisado. */
export async function addNoteAction(_previous: ActionResult<NoteField>, formData: FormData): Promise<ActionResult<NoteField>> {
  const auth = await authorize(PERMISSIONS.CASES_REVIEW);
  if (!auth.ok) return { ok: false, message: auth.message };

  const parsed = noteSchema.safeParse({
    caseId: formData.get("caseId") ?? "",
    body: formData.get("body") ?? "",
    carePlan: formData.get("carePlan") ?? "",
    markReviewed: formData.get("markReviewed") === "on",
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  const { caseId, body, carePlan, markReviewed } = parsed.data;

  const current = await db.clinicalCase.findUnique({ where: { id: caseId }, select: { status: true } });
  if (!current) return { ok: false, message: "El caso ya no existe." };
  if (markReviewed && !carePlan) return { ok: false, fieldErrors: { carePlan: "Para cerrar la revisión indique la conducta a seguir." } };

  const now = new Date();
  await db.$transaction([
    db.medicalNote.create({ data: { caseId, authorId: auth.user.id, body, carePlan } }),
    db.clinicalCase.update({
      where: { id: caseId },
      // `updatedAt` cambia siempre: así la app del promotor descarga la nueva observación.
      data: markReviewed && current.status === "PENDING" ? { status: "REVIEWED", reviewedAt: now, reviewedById: auth.user.id } : { updatedAt: now },
    }),
  ]);

  refresh();
  return { ok: true, message: markReviewed && current.status === "PENDING" ? "Observación guardada y caso marcado como revisado." : "Observación guardada." };
}

/** Devuelve el caso a la bandeja de pendientes (p. ej. si el promotor envió información nueva). */
export async function reopenCaseAction(caseId: string): Promise<ActionResult> {
  const auth = await authorize(PERMISSIONS.CASES_REVIEW);
  if (!auth.ok) return { ok: false, message: auth.message };
  const updated = await db.clinicalCase.updateMany({
    where: { id: caseId, status: "REVIEWED" },
    data: { status: "PENDING", reviewedAt: null, reviewedById: null },
  });
  if (!updated.count) return { ok: false, message: "El caso ya estaba pendiente o no existe." };
  refresh();
  return { ok: true, message: "El caso volvió a la bandeja de pendientes." };
}
