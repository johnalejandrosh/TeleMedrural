/**
 * Datos iniciales de TeleMed Rural: permisos del sistema, roles y un administrador. Con
 * SEED_DEMO distinto de "false" también crea personal de salud, promotores, pacientes y
 * casos de demostración (con todos los niveles de riesgo NEWS2) en municipios del Sumapaz.
 *
 * Es idempotente: se puede ejecutar varias veces sin duplicar ni pisar cambios hechos
 * desde la aplicación (lo que ya existe no se modifica).
 *
 *   npm run db:seed
 *
 * Variables opcionales: SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_DEMO.
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type CarePlan } from "../generated/prisma/client";
import { ADMIN_ROLE_NAME, COORDINATOR_ROLE_NAME, DOCTOR_ROLE_NAME, PROMOTER_ROLE_NAME, SEED_ROLES, SYSTEM_PERMISSIONS } from "../lib/auth/permissions";
import { databaseSchema, databaseUrl } from "../lib/db-url";
import { computeNews2, type Vitals } from "../lib/med/news2";
import { hashPassword } from "../lib/server/password";

const adapter = new PrismaPg({ connectionString: databaseUrl(process.env, { withSchema: false }) }, { schema: databaseSchema() });
const db = new PrismaClient({ adapter });

const DEMO_PASSWORD = "demo1234";
const H = 3_600_000;

const DEMO_USERS = [
  { key: "lr", name: "Laura Rojas", email: "dra.rojas@ejemplo.co", phone: "310 555 0201", municipality: "Fusagasugá", professionalId: "RM-25431", role: DOCTOR_ROLE_NAME },
  { key: "ab", name: "Andrés Beltrán", email: "enf.beltran@ejemplo.co", phone: "311 555 0202", municipality: "Silvania", professionalId: "RE-11872", role: DOCTOR_ROLE_NAME },
  { key: "pl", name: "Patricia León", email: "coordinacion@ejemplo.co", phone: "312 555 0203", municipality: "Fusagasugá", role: COORDINATOR_ROLE_NAME },
  { key: "wc", name: "Wilson Cárdenas", email: "promotor@ejemplo.co", phone: "313 555 0204", municipality: "Silvania", role: PROMOTER_ROLE_NAME },
  { key: "lp", name: "Luz Marina Pardo", email: "luz.pardo@ejemplo.co", phone: "314 555 0205", municipality: "Pasca", role: PROMOTER_ROLE_NAME },
  { key: "yd", name: "Yeison Díaz", email: "yeison.diaz@ejemplo.co", phone: "315 555 0206", municipality: "Tibacuy", role: PROMOTER_ROLE_NAME },
  // Solicitud de registro pendiente de aprobación (cuenta inactiva).
  { key: "cs", name: "Camilo Suárez", email: "pendiente@ejemplo.co", phone: "316 555 0207", municipality: "Arbeláez", professionalId: "RM-30988", role: DOCTOR_ROLE_NAME, inactive: true },
] as const;

type DemoPatient = {
  doc: [string, string | null];
  first: string;
  last: string;
  birth: string;
  sex: "F" | "M";
  insurer?: string;
  phone?: string;
  municipality: string;
  vereda: string;
};

const PATIENTS: Record<string, DemoPatient> = {
  rosa: { doc: ["CC", "20614532"], first: "Rosa Elena", last: "Moreno Díaz", birth: "1958-03-14", sex: "F", insurer: "Convida (subsidiado)", phone: "320 411 2093", municipality: "Silvania", vereda: "Azafranal" },
  jose: { doc: ["CC", "3089221"], first: "José Antonio", last: "Garzón Rey", birth: "1949-09-02", sex: "M", insurer: "Nueva EPS (subsidiado)", municipality: "Silvania", vereda: "Victoria Alta" },
  sofia: { doc: ["TI", "1070612988"], first: "Sofía", last: "Quintero Mora", birth: "2019-06-21", sex: "F", insurer: "Convida (subsidiado)", municipality: "Pasca", vereda: "Corrales" },
  marta: { doc: ["CC", "1069745120"], first: "Marta Lucía", last: "Ríos Peña", birth: "1998-11-30", sex: "F", insurer: "Famisanar", phone: "311 870 5521", municipality: "Pasca", vereda: "El Retiro" },
  hector: { doc: ["CC", "11380447"], first: "Héctor", last: "Baquero Cruz", birth: "1966-01-17", sex: "M", insurer: "Nueva EPS (subsidiado)", municipality: "Tibacuy", vereda: "Bateas" },
  ana: { doc: ["CC", "39561004"], first: "Ana Isabel", last: "Torres Vela", birth: "1975-05-08", sex: "F", insurer: "Convida (subsidiado)", municipality: "Tibacuy", vereda: "La Vuelta" },
  pedro: { doc: ["CC", "1069733871"], first: "Pedro Pablo", last: "Romero Ávila", birth: "1987-02-25", sex: "M", insurer: "No afiliado", municipality: "Silvania", vereda: "Yayatá" },
  carmen: { doc: ["CC", "20599132"], first: "Carmen", last: "Sánchez de Ortiz", birth: "1941-12-03", sex: "F", insurer: "Convida (subsidiado)", municipality: "Pasca", vereda: "Juan Viejo" },
  luis: { doc: ["CC", "80345671"], first: "Luis Fernando", last: "Acosta Gil", birth: "1979-07-19", sex: "M", insurer: "Sanitas", municipality: "Tibacuy", vereda: "Albania" },
  dayana: { doc: ["CC", "1070598341"], first: "Dayana", last: "Melo Castro", birth: "2004-04-12", sex: "F", insurer: "Convida (subsidiado)", municipality: "Silvania", vereda: "San Luis" },
  samuel: { doc: ["RC", "1070722014"], first: "Samuel", last: "Pinto Ruiz", birth: "2024-08-09", sex: "M", insurer: "Convida (subsidiado)", municipality: "Pasca", vereda: "Colombia" },
  ofelia: { doc: ["SD", null], first: "Ofelia", last: "Cubides", birth: "1953-10-10", sex: "F", municipality: "Tibacuy", vereda: "Cumaca" },
  german: { doc: ["CC", "3245890"], first: "Germán", last: "Vanegas Lozano", birth: "1961-03-29", sex: "M", insurer: "Nueva EPS (subsidiado)", municipality: "Silvania", vereda: "Subia" },
  nidia: { doc: ["CC", "52789012"], first: "Nidia", last: "Rojas Herrera", birth: "1982-08-15", sex: "F", insurer: "Famisanar", municipality: "Pasca", vereda: "Bocagrande" },
};

type DemoCase = {
  id: string;
  by: "wc" | "lp" | "yd";
  patient: keyof typeof PATIENTS;
  /** Horas desde la atención en campo. */
  ago: number;
  /** Horas que pasó el teléfono sin señal antes de sincronizar. */
  offline: number;
  complaint: string;
  symptoms: string[];
  onset?: number;
  notes?: string;
  conditions?: string[];
  allergies?: string;
  meds?: string;
  pregnant?: boolean;
  vitals: Vitals & { diastolicBp?: number; glucose?: number; weightKg?: number };
  /** Puntaje distinto del servidor (simula una versión vieja de la app). */
  deviceScore?: number;
  review?: { by: "lr" | "ab"; after: number; plan: CarePlan; body: string };
  extraNote?: { by: "lr" | "ab"; after: number; body: string };
};

const CASES: DemoCase[] = [
  {
    id: "demo-0001", by: "wc", patient: "rosa", ago: 3, offline: 2.5,
    complaint: "Fiebre, tos con flema y dificultad para respirar desde hace 3 días",
    symptoms: ["fiebre", "tos", "dificultad_respiratoria", "malestar"], onset: 3, conditions: ["hipertension", "epoc"], meds: "Losartán 50 mg cada 12 h, salbutamol inhalado",
    notes: "Respira con esfuerzo, usa músculos del cuello. Vive sola, la hija llega en la tarde.",
    vitals: { respiratoryRate: 27, spo2: 86, spo2Scale2: true, supplementalO2: false, systolicBp: 104, diastolicBp: 66, heartRate: 116, consciousness: "A", temperature: 38.7 },
  },
  {
    id: "demo-0002", by: "lp", patient: "carmen", ago: 5, offline: 4,
    complaint: "Desde anoche está confundida y muy decaída, casi no come",
    symptoms: ["confusion", "malestar", "deshidratacion"], onset: 1, conditions: ["diabetes", "hipertension", "renal"], meds: "Metformina, enalapril",
    notes: "La familia dice que no reconoce a los nietos. Orina poco.",
    vitals: { respiratoryRate: 22, spo2: 94, systolicBp: 92, diastolicBp: 58, heartRate: 108, consciousness: "C", temperature: 37.9, glucose: 312 },
  },
  {
    id: "demo-0003", by: "yd", patient: "hector", ago: 7, offline: 6,
    complaint: "Mordedura de serpiente en el pie derecho mientras desyerbaba el cafetal",
    symptoms: ["mordedura_serpiente", "edema", "sangrado"], onset: 0,
    notes: "Hace 1 h. Pie muy hinchado hasta el tobillo, sangra por las marcas. Serpiente marrón con manchas (posible talla X). Se inmovilizó el miembro.",
    vitals: { respiratoryRate: 20, spo2: 97, systolicBp: 90, diastolicBp: 56, heartRate: 112, consciousness: "A", temperature: 36.9 },
  },
  {
    id: "demo-0004", by: "wc", patient: "jose", ago: 10, offline: 8,
    complaint: "Dolor en el pecho al caminar y se le cansan las piernas",
    symptoms: ["dolor_toracico", "dificultad_respiratoria", "edema"], onset: 5, conditions: ["hipertension", "cardiopatia"], meds: "Amlodipino, ASA",
    vitals: { respiratoryRate: 22, spo2: 93, systolicBp: 162, diastolicBp: 98, heartRate: 98, consciousness: "A", temperature: 36.5, weightKg: 81 },
  },
  {
    id: "demo-0005", by: "lp", patient: "sofia", ago: 12, offline: 9,
    complaint: "Niña con fiebre alta y diarrea desde hace dos días",
    symptoms: ["fiebre", "diarrea", "vomito", "deshidratacion"], onset: 2,
    notes: "Ojos hundidos, llora sin lágrimas. Ha vomitado 4 veces hoy.",
    vitals: { respiratoryRate: 30, spo2: 97, systolicBp: 92, heartRate: 138, consciousness: "A", temperature: 39.3, weightKg: 19 },
  },
  {
    id: "demo-0006", by: "lp", patient: "marta", ago: 15, offline: 3,
    complaint: "Gestante de 32 semanas con dolor de cabeza fuerte y visión borrosa",
    symptoms: ["cefalea", "edema"], onset: 1, pregnant: true,
    notes: "Hinchazón en cara y manos. Último control prenatal hace 6 semanas.",
    vitals: { respiratoryRate: 18, spo2: 98, systolicBp: 152, diastolicBp: 104, heartRate: 92, consciousness: "A", temperature: 36.7 },
  },
  {
    id: "demo-0007", by: "yd", patient: "ana", ago: 20, offline: 18,
    complaint: "Ardor al orinar y dolor en la parte baja de la espalda",
    symptoms: ["dolor_orinar", "fiebre", "dolor_abdominal"], onset: 4, conditions: ["diabetes"],
    vitals: { respiratoryRate: 21, spo2: 96, systolicBp: 118, diastolicBp: 76, heartRate: 104, consciousness: "A", temperature: 38.4, glucose: 228 },
    deviceScore: 3,
  },
  {
    id: "demo-0008", by: "wc", patient: "pedro", ago: 26, offline: 20,
    complaint: "Herida en la mano con machete hace 2 horas",
    symptoms: ["trauma", "sangrado"], onset: 0,
    notes: "Corte de 4 cm en la palma, se controló el sangrado con presión. Vacuna antitetánica desconocida.",
    vitals: { respiratoryRate: 16, spo2: 98, systolicBp: 128, diastolicBp: 82, heartRate: 88, consciousness: "A", temperature: 36.6 },
  },
  {
    id: "demo-0009", by: "yd", patient: "ofelia", ago: 30, offline: 26,
    complaint: "Tos de más de un mes y pérdida de peso",
    symptoms: ["tos", "malestar"], onset: 35, conditions: ["desnutricion"],
    notes: "Suda en la noche. No tiene documento; vive con el hijo en la finca.",
    vitals: { respiratoryRate: 25, spo2: 96, systolicBp: 112, heartRate: 88, consciousness: "A", temperature: 37.6, weightKg: 42 },
  },
  {
    id: "demo-0010", by: "lp", patient: "nidia", ago: 34, offline: 30,
    complaint: "Dolor de cabeza y mareo; no ha tomado la medicina de la presión",
    symptoms: ["cefalea", "mareo"], onset: 2, conditions: ["hipertension"],
    // Sin temperatura ni conciencia: el NEWS2 queda parcial.
    vitals: { respiratoryRate: 18, spo2: 97, systolicBp: 148, diastolicBp: 96, heartRate: 84 },
  },
  {
    id: "demo-0011", by: "wc", patient: "german", ago: 40, offline: 1,
    complaint: "Control de diabetes: se siente bien pero tiene la herida del pie que no cierra",
    symptoms: ["edema"], onset: 20, conditions: ["diabetes", "hipertension"], meds: "Insulina NPH 20 U en la mañana",
    vitals: { respiratoryRate: 16, spo2: 97, systolicBp: 134, diastolicBp: 84, heartRate: 78, consciousness: "A", temperature: 36.8, glucose: 186 },
  },
  {
    id: "demo-0012", by: "yd", patient: "luis", ago: 46, offline: 40,
    complaint: "Dolor muscular y fiebre después de fumigar",
    symptoms: ["dolor_muscular", "fiebre", "cefalea", "vomito"], onset: 1,
    notes: "Aplicó un insecticida sin protección ayer. Saliva mucho.",
    vitals: { respiratoryRate: 24, spo2: 95, systolicBp: 108, diastolicBp: 70, heartRate: 54, consciousness: "A", temperature: 38.2 },
  },
  {
    id: "demo-0013", by: "lp", patient: "samuel", ago: 52, offline: 48,
    complaint: "Bebé con tos y respiración rápida",
    symptoms: ["tos", "dificultad_respiratoria", "fiebre"], onset: 3,
    notes: "Se le hunde el pecho al respirar. Come menos.",
    // Solo un dato: sin escala (la ficha pediátrica no toma todos los signos).
    vitals: { temperature: 38.1 },
  },
  {
    id: "demo-0014", by: "wc", patient: "dayana", ago: 60, offline: 55,
    complaint: "Brote en la piel con picazón después de bañarse en la quebrada",
    symptoms: ["erupcion"], onset: 2, allergies: "Penicilina",
    vitals: { respiratoryRate: 16, spo2: 99, systolicBp: 116, diastolicBp: 72, heartRate: 76, consciousness: "A", temperature: 36.9 },
    review: { by: "ab", after: 2, plan: "HOME_CARE", body: "Dermatitis de contacto probable. Loratadina 10 mg/día por 5 días, no usar cremas caseras. Si aparece fiebre o el brote se infecta, cita en el puesto." },
  },
  {
    id: "demo-0015", by: "yd", patient: "hector", ago: 150, offline: 30,
    complaint: "Control de la presión, se le acabó el medicamento",
    symptoms: [], conditions: ["hipertension"], meds: "Losartán 50 mg",
    vitals: { respiratoryRate: 16, spo2: 97, systolicBp: 146, diastolicBp: 92, heartRate: 80, consciousness: "A", temperature: 36.6 },
    review: { by: "lr", after: 5, plan: "APPOINTMENT", body: "Hipertensión no controlada por falta de medicamento. Reiniciar losartán. Cita prioritaria para formular y tomar paraclínicos (creatinina, perfil lipídico)." },
  },
  {
    id: "demo-0016", by: "wc", patient: "rosa", ago: 170, offline: 12,
    complaint: "Tos y ahogo leve, control de EPOC",
    symptoms: ["tos", "dificultad_respiratoria"], onset: 7, conditions: ["hipertension", "epoc"],
    vitals: { respiratoryRate: 21, spo2: 89, spo2Scale2: true, supplementalO2: false, systolicBp: 128, diastolicBp: 80, heartRate: 92, consciousness: "A", temperature: 37.2 },
    review: { by: "lr", after: 3, plan: "HOME_CARE", body: "Exacerbación leve de EPOC. Aumentar salbutamol a 2 puff cada 6 h por 5 días. Signos de alarma explicados al promotor: labios morados, somnolencia o fiebre: consultar de inmediato." },
  },
  {
    id: "demo-0017", by: "lp", patient: "carmen", ago: 200, offline: 50,
    complaint: "Control de glicemia",
    symptoms: [], conditions: ["diabetes", "hipertension", "renal"],
    vitals: { respiratoryRate: 18, spo2: 95, systolicBp: 138, diastolicBp: 84, heartRate: 82, consciousness: "A", temperature: 36.4, glucose: 164 },
    review: { by: "ab", after: 6, plan: "HOME_CARE", body: "Glucometría aceptable para su edad y función renal. Continuar el manejo. Control con el promotor en 15 días." },
  },
  {
    id: "demo-0018", by: "yd", patient: "ana", ago: 230, offline: 70,
    complaint: "Dolor abdominal después de comer",
    symptoms: ["dolor_abdominal", "vomito"], onset: 3,
    vitals: { respiratoryRate: 18, spo2: 98, systolicBp: 120, diastolicBp: 78, heartRate: 94, consciousness: "A", temperature: 37.4 },
    review: { by: "lr", after: 10, plan: "APPOINTMENT", body: "Probable cólico biliar. Dieta sin grasas, butilbromuro de hioscina si hay dolor. Cita para ecografía abdominal. Si el dolor no cede, hay fiebre o color amarillo en la piel: urgencias." },
  },
  {
    id: "demo-0019", by: "wc", patient: "pedro", ago: 260, offline: 2,
    complaint: "Fiebre y dolor de cuerpo desde hace 4 días",
    symptoms: ["fiebre", "dolor_muscular", "cefalea"], onset: 4,
    vitals: { respiratoryRate: 20, spo2: 97, systolicBp: 100, diastolicBp: 64, heartRate: 106, consciousness: "A", temperature: 38.9 },
    review: { by: "ab", after: 4, plan: "REFERRAL", body: "Síndrome febril con hipotensión leve en zona endémica: descartar dengue con signos de alarma. Remitir a la ESE para cuadro hemático y prueba NS1. Hidratación oral abundante, no dar ibuprofeno." },
    extraNote: { by: "lr", after: 30, body: "El promotor informa que fue valorado en la ESE: dengue sin signos de alarma, manejo ambulatorio. Seguimiento diario por el promotor durante 3 días." },
  },
  {
    id: "demo-0020", by: "lp", patient: "marta", ago: 300, offline: 20,
    complaint: "Control prenatal, semana 28",
    symptoms: [], pregnant: true,
    vitals: { respiratoryRate: 17, spo2: 98, systolicBp: 118, diastolicBp: 74, heartRate: 86, consciousness: "A", temperature: 36.7 },
    review: { by: "lr", after: 8, plan: "APPOINTMENT", body: "Signos vitales normales. Recordar control prenatal presencial y ecografía del tercer trimestre. Explicados signos de alarma (dolor de cabeza fuerte, visión borrosa, sangrado)." },
  },
];

async function seedBase() {
  for (const permission of SYSTEM_PERMISSIONS) {
    await db.permission.upsert({
      where: { key: permission.key },
      update: { isSystem: true },
      create: { ...permission, isSystem: true },
    });
  }
  console.log(`✔ ${SYSTEM_PERMISSIONS.length} permisos del sistema`);

  for (const role of SEED_ROLES) {
    const existing = await db.role.findUnique({ where: { name: role.name } });
    if (existing) {
      console.log(`• Rol "${role.name}" ya existe, sin cambios`);
      continue;
    }
    await db.role.create({
      data: {
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        permissions: { create: role.permissions.map((key) => ({ permission: { connect: { key } } })) },
      },
    });
    console.log(`✔ Rol "${role.name}" creado`);
  }

  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@telemedrural.co").trim().toLowerCase();
  const existingAdmin = await db.user.findUnique({ where: { email } });
  if (existingAdmin) {
    console.log(`• Usuario ${email} ya existe, sin cambios`);
  } else {
    const adminRole = await db.role.findUniqueOrThrow({ where: { name: ADMIN_ROLE_NAME } });
    await db.user.create({
      data: {
        name: "Equipo TeleMed Rural",
        email,
        passwordHash: await hashPassword(process.env.SEED_ADMIN_PASSWORD ?? DEMO_PASSWORD),
        roleId: adminRole.id,
        dataConsentAt: new Date(),
      },
    });
    console.log(`✔ Administrador ${email} creado`);
  }
}

async function seedDemo() {
  const roles = new Map((await db.role.findMany({ select: { id: true, name: true } })).map((r) => [r.name, r.id]));
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const now = Date.now();

  const users = new Map<string, string>();
  for (const u of DEMO_USERS) {
    const existing = await db.user.findUnique({ where: { email: u.email }, select: { id: true } });
    const user =
      existing ??
      (await db.user.create({
        data: {
          name: u.name,
          email: u.email,
          phone: u.phone,
          municipality: u.municipality,
          professionalId: "professionalId" in u ? u.professionalId : null,
          passwordHash,
          roleId: roles.get(u.role)!,
          active: !("inactive" in u && u.inactive),
          dataConsentAt: new Date(),
        },
        select: { id: true },
      }));
    users.set(u.key, user.id);
  }
  console.log(`✔ ${DEMO_USERS.length} usuarios de demostración (contraseña: ${DEMO_PASSWORD})`);

  // Un dispositivo por promotor (token ficticio: solo existe su hash).
  const tokens = new Map<string, string>();
  const devices = { wc: "Moto G23 · Silvania", lp: "Samsung A14 · Pasca", yd: "Xiaomi Redmi 12 · Tibacuy" } as const;
  for (const [key, deviceName] of Object.entries(devices)) {
    const id = createHash("sha256").update(`demo-token-${key}`).digest("hex");
    await db.apiToken.upsert({
      where: { id },
      update: {},
      create: { id, userId: users.get(key)!, deviceName, expiresAt: new Date(now + 80 * 24 * H), lastUsedAt: new Date(now - 2 * H) },
    });
    tokens.set(key, id);
  }

  let created = 0;
  for (const c of CASES) {
    if (await db.clinicalCase.findUnique({ where: { clientId: c.id }, select: { id: true } })) continue;
    const p = PATIENTS[c.patient];
    const [documentType, documentNumber] = p.doc as [DemoPatient["doc"][0] & ("CC" | "TI" | "RC" | "SD"), string | null];
    const patientData = {
      firstName: p.first,
      lastName: p.last,
      birthDate: new Date(`${p.birth}T00:00:00Z`),
      sex: p.sex,
      insurer: p.insurer ?? null,
      phone: p.phone ?? null,
      municipality: p.municipality,
      vereda: p.vereda,
    };
    const patient =
      documentNumber !== null
        ? await db.patient.upsert({
            where: { documentType_documentNumber: { documentType, documentNumber } },
            update: {},
            create: { documentType, documentNumber, ...patientData },
          })
        : ((await db.patient.findFirst({ where: { documentType: "SD", firstName: p.first, lastName: p.last } })) ??
          (await db.patient.create({ data: { documentType: "SD", documentNumber: null, ...patientData } })));

    const capturedAt = new Date(now - c.ago * H);
    const syncedAt = new Date(capturedAt.getTime() + c.offline * H);
    const batch = await db.syncBatch.create({
      data: { userId: users.get(c.by)!, tokenId: tokens.get(c.by), appVersion: c.deviceScore !== undefined ? "0.9.2" : "1.0.0", received: 1, created: 1, receivedAt: syncedAt },
    });
    // La app siempre envía «aire u oxígeno» (por defecto aire).
    const v = { supplementalO2: false, ...c.vitals };
    const news2 = computeNews2(v);
    const reviewedAt = c.review ? new Date(syncedAt.getTime() + c.review.after * H) : null;

    const record = await db.clinicalCase.create({
      data: {
        clientId: c.id,
        patientId: patient.id,
        capturedById: users.get(c.by)!,
        syncBatchId: batch.id,
        capturedAt,
        syncedAt,
        municipality: p.municipality,
        vereda: p.vereda,
        chiefComplaint: c.complaint,
        symptoms: c.symptoms,
        symptomsNotes: c.notes ?? null,
        onsetDays: c.onset ?? null,
        conditions: c.conditions ?? [],
        allergies: c.allergies ?? null,
        medications: c.meds ?? null,
        pregnant: p.sex === "F" ? (c.pregnant ?? false) : null,
        respiratoryRate: v.respiratoryRate ?? null,
        spo2: v.spo2 ?? null,
        spo2Scale2: v.spo2Scale2 ?? false,
        supplementalO2: v.supplementalO2 ?? false,
        systolicBp: v.systolicBp ?? null,
        diastolicBp: v.diastolicBp ?? null,
        heartRate: v.heartRate ?? null,
        consciousness: v.consciousness ?? null,
        temperature: v.temperature ?? null,
        glucose: v.glucose ?? null,
        weightKg: v.weightKg ?? null,
        news2Score: news2?.score ?? null,
        news2DeviceScore: c.deviceScore ?? news2?.score ?? null,
        riskLevel: news2?.risk ?? null,
        news2Breakdown: news2 ? news2.breakdown : undefined,
        news2Incomplete: news2 ? news2.incomplete : true,
        status: c.review ? "REVIEWED" : "PENDING",
        reviewedAt,
        reviewedById: c.review ? users.get(c.review.by)! : null,
      },
    });
    if (c.review) {
      await db.medicalNote.create({ data: { caseId: record.id, authorId: users.get(c.review.by)!, body: c.review.body, carePlan: c.review.plan, createdAt: reviewedAt! } });
    }
    if (c.extraNote) {
      await db.medicalNote.create({ data: { caseId: record.id, authorId: users.get(c.extraNote.by)!, body: c.extraNote.body, createdAt: new Date(syncedAt.getTime() + c.extraNote.after * H) } });
    }
    created++;
  }
  console.log(`✔ ${created} casos de demostración nuevos (${CASES.length} en el catálogo)`);
}

async function main() {
  await seedBase();
  if (process.env.SEED_DEMO !== "false") await seedDemo();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
