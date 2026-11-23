import { CARE_PLANS, CONDITIONS, DOCUMENT_TYPES, MUNICIPIOS, SYMPTOMS } from "@/lib/med/catalog";
import { MAX_CASES_PER_BATCH } from "@/lib/validation/sync";

/** GET /api/v1/catalogos — catálogos que la app guarda para trabajar sin conexión (público, estático). */
export async function GET() {
  return Response.json({
    version: 1,
    news2: "RCP 2017",
    maxCasesPerBatch: MAX_CASES_PER_BATCH,
    documentTypes: DOCUMENT_TYPES,
    symptoms: SYMPTOMS,
    conditions: CONDITIONS,
    carePlans: Object.fromEntries(Object.entries(CARE_PLANS).map(([k, v]) => [k, v.label])),
    municipalities: MUNICIPIOS,
  });
}
