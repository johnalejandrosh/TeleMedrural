import { PERMISSIONS } from "@/lib/auth/permissions";
import { apiCan, apiError, authenticateApi, issueApiToken } from "@/lib/server/api-auth";
import { db } from "@/lib/server/db";
import { getDummyHash, verifyPassword } from "@/lib/server/password";
import { tokenRequestSchema } from "@/lib/validation/sync";

/**
 * POST /api/v1/auth/token — la app móvil inicia sesión y recibe un token Bearer.
 * Body: { email, password, deviceName }.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = tokenRequestSchema.safeParse(body);
  if (!parsed.success) return apiError(400, "Faltan el correo, la contraseña o el nombre del dispositivo.");
  const { email, password, deviceName } = parsed.data;

  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      passwordHash: true,
      role: { select: { name: true, isSystem: true, permissions: { select: { permission: { select: { key: true } } } } } },
    },
  });
  // Se compara siempre (con un hash de relleno si el correo no existe) para no revelar cuentas.
  const valid = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !valid) return apiError(401, "Correo o contraseña incorrectos.");
  if (!user.active) return apiError(403, "La cuenta está desactivada o pendiente de aprobación.");

  const permissions = user.role.permissions.map(({ permission }) => permission.key);
  if (!apiCan({ isSuperAdmin: user.role.isSystem, permissions }, PERMISSIONS.CASES_SYNC)) {
    return apiError(403, "Su rol no puede enviar casos desde la app.");
  }

  const { token, expiresAt } = await issueApiToken(user.id, deviceName);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return Response.json(
    { token, tokenType: "Bearer", expiresAt: expiresAt.toISOString(), user: { id: user.id, name: user.name, email: user.email, role: user.role.name } },
    { status: 201, headers: { "cache-control": "no-store" } },
  );
}

/** DELETE /api/v1/auth/token — cierra la sesión del dispositivo (revoca el token actual). */
export async function DELETE(request: Request) {
  const user = await authenticateApi(request);
  if (!user) return apiError(401, "Token inválido o vencido.");
  await db.apiToken.update({ where: { id: user.tokenId }, data: { revokedAt: new Date() } });
  return new Response(null, { status: 204 });
}
