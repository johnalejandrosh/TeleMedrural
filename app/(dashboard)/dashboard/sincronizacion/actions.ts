"use server";

import { refresh } from "next/cache";
import type { ActionResult } from "@/lib/actions";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorize } from "@/lib/server/dal";
import { db } from "@/lib/server/db";

/** Revoca el token de un dispositivo (teléfono perdido, promotor que deja el programa…). */
export async function revokeTokenAction(id: string): Promise<ActionResult> {
  const auth = await authorize(PERMISSIONS.SYNC_MANAGE);
  if (!auth.ok) return { ok: false, message: auth.message };
  const updated = await db.apiToken.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date() } });
  if (!updated.count) return { ok: false, message: "El dispositivo ya estaba revocado." };
  refresh();
  return { ok: true, message: "Se revocó el acceso del dispositivo. Deberá iniciar sesión de nuevo en la app." };
}
