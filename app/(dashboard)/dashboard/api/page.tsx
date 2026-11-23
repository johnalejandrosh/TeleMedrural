import type { Metadata } from "next";
import { Suspense } from "react";
import { NoAccess } from "@/components/admin/no-access";
import { PageHead } from "@/components/med/page-head";
import { ListSkeleton } from "@/components/med/skeletons";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { hasPermission, requireUser } from "@/lib/server/dal";
import { MAX_CASES_PER_BATCH } from "@/lib/validation/sync";

export const metadata: Metadata = {
  title: "API de la app móvil",
};

export default function ApiDocsPage() {
  return (
    <>
      <PageHead
        eyebrow="Integración"
        title="API de la app móvil"
        subtitle="Contrato REST (JSON) entre la app de los promotores, que trabaja sin conexión, y esta plataforma."
      />
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <ApiSection />
      </Suspense>
    </>
  );
}

const LOGIN = `POST /api/v1/auth/token
Content-Type: application/json

{ "email": "promotor@ejemplo.co", "password": "••••••••", "deviceName": "Moto G23 · Silvania" }

→ 201 { "token": "tmr_…", "tokenType": "Bearer", "expiresAt": "…", "user": { … } }`;

const SYNC = `POST /api/v1/casos
Authorization: Bearer tmr_…

{
  "appVersion": "1.0.0",
  "cases": [{
    "clientId": "6f1c2a8e-5b0d-4c1e-9a77-2f0e8d1b3c40",
    "capturedAt": "2026-11-20T09:42:00-05:00",
    "municipality": "Silvania",
    "vereda": "Azafranal",
    "location": { "lat": 4.4031, "lon": -74.3879 },
    "patient": {
      "documentType": "CC", "documentNumber": "1069712345",
      "firstName": "Rosa Elena", "lastName": "Moreno Díaz",
      "birthDate": "1958-03-14", "sex": "F", "insurer": "Convida (subsidiado)"
    },
    "chiefComplaint": "Fiebre y dificultad para respirar desde hace 3 días",
    "symptoms": ["fiebre", "tos", "dificultad_respiratoria"],
    "onsetDays": 3,
    "background": { "conditions": ["hipertension", "epoc"], "medications": "Losartán 50 mg" },
    "vitals": {
      "respiratoryRate": 26, "spo2": 89, "spo2Scale2": true, "supplementalO2": false,
      "systolicBp": 104, "diastolicBp": 66, "heartRate": 112,
      "consciousness": "A", "temperature": 38.6
    },
    "triage": { "news2Score": 8 }
  }]
}`;

const SYNC_RESPONSE = `→ 200 {
  "batchId": "…",
  "results": [
    { "clientId": "6f1c…", "status": "created", "caseNumber": 131, "news2Score": 8, "riskLevel": "HIGH" },
    { "clientId": "a2b9…", "status": "duplicate", "caseNumber": 127 },
    { "clientId": "c771…", "status": "rejected", "error": "vitals.spo2: Too big: expected number to be <=100" }
  ]
}`;

const FEEDBACK = `GET /api/v1/casos?desde=2026-11-19T00:00:00Z
Authorization: Bearer tmr_…

→ 200 { "serverTime": "…", "cases": [{ "clientId": "…", "status": "REVIEWED",
        "notes": [{ "author": "Laura Rojas", "carePlan": "REFERRAL", "body": "…" }] }] }`;

async function ApiSection() {
  const user = await requireUser();
  if (!hasPermission(user, PERMISSIONS.SYNC_READ) && !hasPermission(user, PERMISSIONS.CASES_SYNC)) return <NoAccess permission={PERMISSIONS.SYNC_READ} />;

  return (
    <div className="api-docs">
      <section className="card">
        <div className="card-body">
          <h2 className="h5">Cómo funciona la sincronización</h2>
          <ol className="steps">
            <li>
              <b>Inicio de sesión una vez, con señal.</b> La app pide un token y lo guarda cifrado en el teléfono. Dura 90 días; un administrador puede revocarlo
              en «Sincronización».
            </li>
            <li>
              <b>Registro sin conexión.</b> Cada ficha recibe un <code>clientId</code> (UUID) generado en el teléfono y queda en la cola local. La app calcula el
              NEWS2 para orientar al promotor en el momento.
            </li>
            <li>
              <b>Envío al recuperar la señal.</b> La app manda la cola en lotes de hasta {MAX_CASES_PER_BATCH} casos. Si se corta la conexión antes de recibir la
              respuesta, puede reenviar el mismo lote: los casos repetidos vuelven como <code>duplicate</code> y no se crean dos veces.
            </li>
            <li>
              <b>Verificación en el servidor.</b> Cada caso se valida por separado (rangos fisiológicos, fechas, catálogos) y se recalcula el NEWS2. Un caso con
              errores vuelve como <code>rejected</code> sin afectar a los demás.
            </li>
            <li>
              <b>Retroalimentación.</b> La app consulta los casos propios actualizados para mostrar al promotor el concepto y la conducta del profesional.
            </li>
          </ol>
        </div>
      </section>

      <section className="card">
        <div className="card-body">
          <h2 className="h6 endpoint">
            <span className="method">POST</span> /api/v1/auth/token
          </h2>
          <p className="text-body-secondary">Inicia sesión en la app. Solo para roles con el permiso «Sincronizar desde la app» (cases.sync).</p>
          <pre className="code-block">{LOGIN}</pre>
        </div>
      </section>

      <section className="card">
        <div className="card-body">
          <h2 className="h6 endpoint">
            <span className="method">POST</span> /api/v1/casos
          </h2>
          <p className="text-body-secondary">
            Envía un lote de casos. Campos de signos vitales opcionales: si faltan, el NEWS2 se marca como parcial. Fechas en ISO 8601 con zona horaria.
          </p>
          <pre className="code-block">{SYNC}</pre>
          <pre className="code-block">{SYNC_RESPONSE}</pre>
        </div>
      </section>

      <section className="card">
        <div className="card-body">
          <h2 className="h6 endpoint">
            <span className="method method--get">GET</span> /api/v1/casos?desde=…
          </h2>
          <p className="text-body-secondary">Casos propios cambiados desde la fecha indicada, con estado y observaciones médicas.</p>
          <pre className="code-block">{FEEDBACK}</pre>
        </div>
      </section>

      <section className="card">
        <div className="card-body">
          <h2 className="h6 endpoint">
            <span className="method method--get">GET</span> /api/v1/catalogos
          </h2>
          <p className="text-body-secondary mb-0">
            Catálogos para trabajar sin conexión: tipos de documento, síntomas, antecedentes, conductas y municipios sugeridos. Público.
          </p>
        </div>
      </section>
    </div>
  );
}
