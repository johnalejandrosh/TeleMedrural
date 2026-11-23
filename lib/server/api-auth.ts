/**
 * Autenticación de la app móvil con tokens Bearer. Como las sesiones web, en la base
 * solo se guarda el SHA-256 del token; el token en claro se entrega una sola vez.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import type { PermissionKey } from "@/lib/auth/permissions";
import { db } from "./db";
import { hashSessionToken } from "./session";

/** Los promotores pueden pasar semanas sin señal: el token dura 90 días. */
export const API_TOKEN_MS = 90 * 24 * 60 * 60 * 1000;
const TOUCH_EVERY_MS = 5 * 60 * 1000;

export type ApiUser = {
  id: string;
  name: string;
  email: string;
  roleName: string;
  isSuperAdmin: boolean;
  permissions: string[];
  tokenId: string;
};

export async function issueApiToken(userId: string, deviceName: string) {
  const token = `tmr_${randomBytes(32).toString("base64url")}`;
  const expiresAt = new Date(Date.now() + API_TOKEN_MS);
  await db.apiToken.create({ data: { id: hashSessionToken(token), userId, deviceName, expiresAt, lastUsedAt: new Date() } });
  return { token, expiresAt };
}

const bearer = (request: Request) => /^Bearer\s+(\S+)$/i.exec(request.headers.get("authorization") ?? "")?.[1];

/** Usuario dueño del token, o `null` si falta, expiró, fue revocado o la cuenta está inactiva. */
export async function authenticateApi(request: Request): Promise<ApiUser | null> {
  const token = bearer(request);
  if (!token) return null;
  const row = await db.apiToken.findUnique({
    where: { id: hashSessionToken(token) },
    select: {
      id: true,
      expiresAt: true,
      revokedAt: true,
      lastUsedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          active: true,
          role: { select: { name: true, isSystem: true, permissions: { select: { permission: { select: { key: true } } } } } },
        },
      },
    },
  });
  if (!row || row.revokedAt || row.expiresAt <= new Date() || !row.user.active) return null;

  if (!row.lastUsedAt || Date.now() - row.lastUsedAt.getTime() > TOUCH_EVERY_MS) {
    await db.apiToken.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } });
  }
  const { user } = row;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roleName: user.role.name,
    isSuperAdmin: user.role.isSystem,
    permissions: user.role.permissions.map(({ permission }) => permission.key),
    tokenId: row.id,
  };
}

export const apiCan = (user: Pick<ApiUser, "isSuperAdmin" | "permissions">, permission: PermissionKey) =>
  user.isSuperAdmin || user.permissions.includes(permission);

/** Respuesta de error JSON uniforme para la API. */
export function apiError(status: number, error: string, detail?: unknown) {
  return Response.json({ error, ...(detail === undefined ? {} : { detail }) }, { status, headers: { "cache-control": "no-store" } });
}
