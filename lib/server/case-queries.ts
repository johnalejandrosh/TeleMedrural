/**
 * Consultas de casos, pacientes y sincronización. Las páginas verifican el permiso con
 * el DAL y pasan el alcance (`caseScope`) para que cada usuario vea solo lo que le toca.
 */
import "server-only";
import type { CaseStatus, Prisma, RiskLevel } from "@/generated/prisma/client";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DAY_MS, TZ } from "@/lib/med/format";
import { hasPermission, type CurrentUser } from "./dal";
import { db } from "./db";

// ----------------------------------------------------------------- Alcance

/** Todos los casos (profesional, coordinador), solo los propios (promotor) o ninguno. */
export function caseScope(user: CurrentUser): Prisma.ClinicalCaseWhereInput | null {
  if (hasPermission(user, PERMISSIONS.CASES_READ)) return {};
  if (hasPermission(user, PERMISSIONS.CASES_READ_OWN)) return { capturedById: user.id };
  return null;
}

const URGENT: RiskLevel[] = ["HIGH", "MEDIUM"];

/** Insignias del menú y del encabezado. */
export async function countPending(user: CurrentUser) {
  const scope = caseScope(user);
  if (!scope) return { pending: 0, urgent: 0 };
  const [pending, urgent] = await Promise.all([
    db.clinicalCase.count({ where: { ...scope, status: "PENDING" } }),
    db.clinicalCase.count({ where: { ...scope, status: "PENDING", riskLevel: { in: URGENT } } }),
  ]);
  return { pending, urgent };
}

// ----------------------------------------------------------------- Bandeja

export const CASES_PAGE_SIZE = 15;

export const RISK_PARAM = { alto: "HIGH", medio: "MEDIUM", "bajo-medio": "LOW_MEDIUM", bajo: "LOW" } as const satisfies Record<string, RiskLevel>;
type RiskParam = keyof typeof RISK_PARAM | "urgente" | "sin" | "";

export type CaseFilters = {
  q: string;
  estado: "pendiente" | "revisado" | "todos";
  riesgo: RiskParam;
  municipio: string;
  promotor: string;
  page: number;
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

export function parseCaseFilters(params: Record<string, string | string[] | undefined>, defaultEstado: CaseFilters["estado"]): CaseFilters {
  const estado = first(params.estado);
  const riesgo = first(params.riesgo);
  const page = Number.parseInt(first(params.pagina), 10);
  return {
    q: first(params.q).trim().slice(0, 100),
    estado: estado === "pendiente" || estado === "revisado" || estado === "todos" ? estado : defaultEstado,
    riesgo: riesgo in RISK_PARAM || riesgo === "urgente" || riesgo === "sin" ? (riesgo as RiskParam) : "",
    municipio: first(params.municipio).trim().slice(0, 80),
    promotor: first(params.promotor).slice(0, 40),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

function caseWhere(scope: Prisma.ClinicalCaseWhereInput, f: CaseFilters): Prisma.ClinicalCaseWhereInput {
  const and: Prisma.ClinicalCaseWhereInput[] = [scope];
  if (f.estado !== "todos") and.push({ status: f.estado === "pendiente" ? "PENDING" : "REVIEWED" });
  if (f.riesgo === "urgente") and.push({ riskLevel: { in: URGENT } });
  else if (f.riesgo === "sin") and.push({ riskLevel: null });
  else if (f.riesgo) and.push({ riskLevel: RISK_PARAM[f.riesgo] });
  if (f.municipio) and.push({ municipality: { equals: f.municipio, mode: "insensitive" } });
  if (f.promotor) and.push({ capturedById: f.promotor });
  if (f.q) {
    const code = /^(?:tmr-?)?0*(\d{1,9})$/i.exec(f.q)?.[1];
    and.push({
      OR: [
        { patient: { firstName: { contains: f.q, mode: "insensitive" } } },
        { patient: { lastName: { contains: f.q, mode: "insensitive" } } },
        { patient: { documentNumber: { contains: f.q } } },
        { chiefComplaint: { contains: f.q, mode: "insensitive" } },
        { vereda: { contains: f.q, mode: "insensitive" } },
        ...(code ? [{ number: Number(code) }] : []),
      ],
    });
  }
  return { AND: and };
}

const caseRowSelect = {
  id: true,
  number: true,
  status: true,
  capturedAt: true,
  syncedAt: true,
  reviewedAt: true,
  riskLevel: true,
  news2Score: true,
  news2Incomplete: true,
  chiefComplaint: true,
  symptoms: true,
  municipality: true,
  vereda: true,
  pregnant: true,
  patient: { select: { id: true, firstName: true, lastName: true, birthDate: true, sex: true, documentType: true, documentNumber: true } },
  capturedBy: { select: { id: true, name: true } },
  reviewedBy: { select: { name: true } },
  _count: { select: { notes: true } },
} satisfies Prisma.ClinicalCaseSelect;

export type CaseRow = Prisma.ClinicalCaseGetPayload<{ select: typeof caseRowSelect }>;

/** Orden de atención: pendientes primero, el más grave arriba y, a igual riesgo, el que más lleva esperando. */
function caseOrder(f: CaseFilters): Prisma.ClinicalCaseOrderByWithRelationInput[] {
  if (f.estado === "revisado") return [{ reviewedAt: "desc" }];
  return [{ status: "asc" }, { riskLevel: { sort: "desc", nulls: "last" } }, { capturedAt: "asc" }];
}

export async function listCases(scope: Prisma.ClinicalCaseWhereInput, f: CaseFilters) {
  const where = caseWhere(scope, f);
  const [total, rows] = await db.$transaction([
    db.clinicalCase.count({ where }),
    db.clinicalCase.findMany({ where, orderBy: caseOrder(f), skip: (f.page - 1) * CASES_PAGE_SIZE, take: CASES_PAGE_SIZE, select: caseRowSelect }),
  ]);
  return { total, pageCount: Math.max(1, Math.ceil(total / CASES_PAGE_SIZE)), rows };
}

/** Conteo de pendientes por nivel de riesgo (chips de la bandeja y tarjetas del inicio). */
export async function pendingByRisk(scope: Prisma.ClinicalCaseWhereInput) {
  const groups = await db.clinicalCase.groupBy({ by: ["riskLevel"], where: { ...scope, status: "PENDING" }, _count: { _all: true } });
  const out: Record<RiskLevel | "NONE", number> = { HIGH: 0, MEDIUM: 0, LOW_MEDIUM: 0, LOW: 0, NONE: 0 };
  for (const g of groups) out[g.riskLevel ?? "NONE"] = g._count._all;
  return out;
}

/** Opciones de los filtros: municipios con casos y promotores que han sincronizado. */
export async function caseFilterOptions(scope: Prisma.ClinicalCaseWhereInput) {
  const [municipios, promotores] = await Promise.all([
    db.clinicalCase.findMany({ where: scope, distinct: ["municipality"], select: { municipality: true }, orderBy: { municipality: "asc" } }),
    db.user.findMany({ where: { casesCaptured: { some: scope } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return { municipios: municipios.map((m) => m.municipality), promotores };
}

// ----------------------------------------------------------------- Detalle

export async function getCaseDetail(id: string, scope: Prisma.ClinicalCaseWhereInput) {
  const c = await db.clinicalCase.findFirst({
    where: { AND: [scope, { id }] },
    include: {
      patient: true,
      capturedBy: { select: { id: true, name: true, phone: true, municipality: true } },
      reviewedBy: { select: { name: true } },
      syncBatch: { select: { appVersion: true } },
      notes: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true, professionalId: true, role: { select: { name: true } } } } },
      },
    },
  });
  if (!c) return null;
  const history = await db.clinicalCase.findMany({
    where: { AND: [scope, { patientId: c.patientId, id: { not: c.id } }] },
    orderBy: { capturedAt: "desc" },
    take: 8,
    select: { id: true, number: true, capturedAt: true, riskLevel: true, news2Score: true, chiefComplaint: true, status: true },
  });
  return { ...c, history };
}

export type CaseDetail = NonNullable<Awaited<ReturnType<typeof getCaseDetail>>>;

// ----------------------------------------------------------------- Inicio

/** Medianoche de hoy en Colombia (UTC−5, sin horario de verano). */
function startOfTodayBogota(now = Date.now()) {
  const local = new Date(now - 5 * 3_600_000);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) + 5 * 3_600_000);
}

const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

export async function getDashboard(scope: Prisma.ClinicalCaseWhereInput) {
  const today = startOfTodayBogota();
  const since = new Date(today.getTime() - 13 * DAY_MS);

  const [byRisk, urgentes, recientes, hoy, revisados, ultimasNotas] = await Promise.all([
    pendingByRisk(scope),
    db.clinicalCase.findMany({
      where: { ...scope, status: "PENDING" },
      orderBy: [{ riskLevel: { sort: "desc", nulls: "last" } }, { capturedAt: "asc" }],
      take: 6,
      select: caseRowSelect,
    }),
    db.clinicalCase.findMany({ where: { ...scope, syncedAt: { gte: since } }, select: { syncedAt: true, riskLevel: true } }),
    db.clinicalCase.count({ where: { ...scope, syncedAt: { gte: today } } }),
    db.clinicalCase.findMany({
      where: { ...scope, status: "REVIEWED", reviewedAt: { gte: new Date(Date.now() - 7 * DAY_MS) } },
      select: { syncedAt: true, reviewedAt: true },
    }),
    db.medicalNote.findMany({
      where: { case: scope },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        body: true,
        carePlan: true,
        createdAt: true,
        author: { select: { name: true } },
        case: { select: { id: true, number: true, patient: { select: { firstName: true, lastName: true } } } },
      },
    }),
  ]);

  // Serie de los últimos 14 días, por nivel de riesgo.
  const days = Array.from({ length: 14 }, (_, i) => dayKey.format(new Date(since.getTime() + i * DAY_MS + 12 * 3_600_000)));
  const serie = Object.fromEntries(days.map((d) => [d, { HIGH: 0, MEDIUM: 0, LOW_MEDIUM: 0, LOW: 0, NONE: 0 }]));
  for (const r of recientes) {
    const k = dayKey.format(r.syncedAt);
    if (serie[k]) serie[k][r.riskLevel ?? "NONE"]++;
  }

  const tiempos = revisados.map((r) => r.reviewedAt!.getTime() - r.syncedAt.getTime()).sort((a, b) => a - b);
  const mediana = tiempos.length ? tiempos[Math.floor(tiempos.length / 2)] : null;

  return {
    byRisk,
    pendientes: Object.values(byRisk).reduce((a, b) => a + b, 0),
    urgentes,
    hoy,
    revisados7: revisados.length,
    medianaRevisionMs: mediana,
    serie: days.map((d) => ({ day: d, ...serie[d] })),
    ultimasNotas,
  };
}

// ----------------------------------------------------------------- Pacientes

export const PATIENTS_PAGE_SIZE = 15;

export function parsePatientFilters(params: Record<string, string | string[] | undefined>) {
  const page = Number.parseInt(first(params.pagina), 10);
  return {
    q: first(params.q).trim().slice(0, 100),
    municipio: first(params.municipio).trim().slice(0, 80),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export async function listPatients(f: ReturnType<typeof parsePatientFilters>) {
  const where: Prisma.PatientWhereInput = {
    ...(f.municipio && { municipality: { equals: f.municipio, mode: "insensitive" } }),
    ...(f.q && {
      OR: [
        { firstName: { contains: f.q, mode: "insensitive" } },
        { lastName: { contains: f.q, mode: "insensitive" } },
        { documentNumber: { contains: f.q } },
        { vereda: { contains: f.q, mode: "insensitive" } },
      ],
    }),
  };
  const [total, rows, municipios] = await db.$transaction([
    db.patient.count({ where }),
    db.patient.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (f.page - 1) * PATIENTS_PAGE_SIZE,
      take: PATIENTS_PAGE_SIZE,
      include: {
        _count: { select: { cases: true } },
        cases: { orderBy: { capturedAt: "desc" }, take: 1, select: { id: true, capturedAt: true, riskLevel: true, news2Score: true, status: true } },
      },
    }),
    db.patient.findMany({ distinct: ["municipality"], select: { municipality: true }, orderBy: { municipality: "asc" } }),
  ]);
  return { total, pageCount: Math.max(1, Math.ceil(total / PATIENTS_PAGE_SIZE)), rows, municipios: municipios.map((m) => m.municipality) };
}

export async function getPatient(id: string) {
  return db.patient.findUnique({
    where: { id },
    include: {
      cases: {
        orderBy: { capturedAt: "desc" },
        select: {
          id: true,
          number: true,
          capturedAt: true,
          status: true,
          riskLevel: true,
          news2Score: true,
          chiefComplaint: true,
          respiratoryRate: true,
          spo2: true,
          systolicBp: true,
          diastolicBp: true,
          heartRate: true,
          temperature: true,
          capturedBy: { select: { name: true } },
          _count: { select: { notes: true } },
        },
      },
    },
  });
}

// ----------------------------------------------------------------- Sincronización

export async function getSyncOverview() {
  const [batches, tokens, totals] = await Promise.all([
    db.syncBatch.findMany({
      orderBy: { receivedAt: "desc" },
      take: 30,
      include: { user: { select: { name: true } }, token: { select: { deviceName: true } } },
    }),
    db.apiToken.findMany({
      orderBy: [{ revokedAt: { sort: "desc", nulls: "first" } }, { lastUsedAt: { sort: "desc", nulls: "last" } }],
      take: 50,
      include: { user: { select: { name: true, role: { select: { name: true } } } }, _count: { select: { batches: true } } },
    }),
    db.syncBatch.aggregate({
      where: { receivedAt: { gte: new Date(Date.now() - 30 * DAY_MS) } },
      _sum: { received: true, created: true, duplicated: true, rejected: true },
      _count: { _all: true },
    }),
  ]);
  return { batches, tokens, totals };
}

export type CaseStatusKey = CaseStatus;
