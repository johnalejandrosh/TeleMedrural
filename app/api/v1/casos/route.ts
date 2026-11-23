import { PERMISSIONS } from "@/lib/auth/permissions";
import { apiCan, apiError, authenticateApi } from "@/lib/server/api-auth";
import { db } from "@/lib/server/db";
import { ingestBatch } from "@/lib/server/sync";
import { batchSchema, firstIssue } from "@/lib/validation/sync";

/**
 * POST /api/v1/casos — la app envía los casos guardados sin conexión.
 * Body: { appVersion?, cases: [...] } (máx. 100). Responde 200 con el resultado de cada caso:
 * "created", "duplicate" (ya había llegado: la app puede marcarlo como enviado) o "rejected".
 */
export async function POST(request: Request) {
  const user = await authenticateApi(request);
  if (!user) return apiError(401, "Token inválido o vencido.");
  if (!apiCan(user, PERMISSIONS.CASES_SYNC)) return apiError(403, "Su rol no puede enviar casos.");

  const body = await request.json().catch(() => null);
  const parsed = batchSchema.safeParse(body);
  if (!parsed.success) return apiError(400, firstIssue(parsed.error));

  const result = await ingestBatch({ userId: user.id, tokenId: user.tokenId, appVersion: parsed.data.appVersion ?? null, cases: parsed.data.cases });
  return Response.json(result, { headers: { "cache-control": "no-store" } });
}

/**
 * GET /api/v1/casos?desde=ISO — casos propios actualizados desde esa fecha, con el
 * estado de revisión y las observaciones médicas, para que el promotor haga el seguimiento.
 */
export async function GET(request: Request) {
  const user = await authenticateApi(request);
  if (!user) return apiError(401, "Token inválido o vencido.");

  const desde = new URL(request.url).searchParams.get("desde");
  const since = desde ? new Date(desde) : null;
  if (since && Number.isNaN(since.getTime())) return apiError(400, "El parámetro «desde» debe ser una fecha ISO 8601.");

  const cases = await db.clinicalCase.findMany({
    where: { capturedById: user.id, ...(since && { updatedAt: { gt: since } }) },
    orderBy: { updatedAt: "asc" },
    take: 200,
    select: {
      id: true,
      clientId: true,
      number: true,
      status: true,
      news2Score: true,
      riskLevel: true,
      reviewedAt: true,
      updatedAt: true,
      reviewedBy: { select: { name: true } },
      notes: { orderBy: { createdAt: "asc" }, select: { id: true, body: true, carePlan: true, createdAt: true, author: { select: { name: true } } } },
    },
  });

  return Response.json(
    {
      serverTime: new Date().toISOString(),
      cases: cases.map((c) => ({
        ...c,
        reviewedBy: c.reviewedBy?.name ?? null,
        notes: c.notes.map((n) => ({ ...n, author: n.author.name })),
      })),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
