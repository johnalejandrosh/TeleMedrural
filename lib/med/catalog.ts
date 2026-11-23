/**
 * Catálogos compartidos con la app móvil. La app envía las claves; la plataforma muestra
 * la etiqueta. Si llega una clave desconocida (app más nueva), se muestra tal cual.
 */

export const SYMPTOMS: Record<string, string> = {
  fiebre: "Fiebre",
  tos: "Tos",
  dificultad_respiratoria: "Dificultad para respirar",
  dolor_toracico: "Dolor en el pecho",
  dolor_abdominal: "Dolor abdominal",
  diarrea: "Diarrea",
  vomito: "Vómito",
  deshidratacion: "Signos de deshidratación",
  cefalea: "Dolor de cabeza",
  mareo: "Mareo o desmayo",
  confusion: "Confusión o somnolencia",
  convulsion: "Convulsión",
  sangrado: "Sangrado",
  trauma: "Golpe, herida o caída",
  mordedura_serpiente: "Mordedura de serpiente",
  picadura: "Picadura o mordedura de animal",
  erupcion: "Brote o lesiones en la piel",
  dolor_orinar: "Ardor o dolor al orinar",
  edema: "Hinchazón (edema)",
  dolor_muscular: "Dolor muscular o articular",
  malestar: "Malestar general",
};

export const CONDITIONS: Record<string, string> = {
  hipertension: "Hipertensión arterial",
  diabetes: "Diabetes",
  epoc: "EPOC",
  asma: "Asma",
  cardiopatia: "Enfermedad del corazón",
  renal: "Enfermedad renal crónica",
  tuberculosis: "Tuberculosis",
  vih: "VIH",
  cancer: "Cáncer",
  desnutricion: "Desnutrición",
  malaria_previa: "Malaria previa",
  discapacidad: "Discapacidad",
};

export const label = (catalog: Record<string, string>, key: string) => catalog[key] ?? key.replaceAll("_", " ");

export const DOCUMENT_TYPES = {
  CC: "Cédula de ciudadanía",
  TI: "Tarjeta de identidad",
  RC: "Registro civil",
  CE: "Cédula de extranjería",
  PPT: "Permiso por protección temporal",
  PA: "Pasaporte",
  SD: "Sin documento",
} as const;

export type DocumentTypeKey = keyof typeof DOCUMENT_TYPES;

export const SEX_TXT = { F: "Mujer", M: "Hombre", I: "Intersexual" } as const;

export const CARE_PLANS = {
  HOME_CARE: { label: "Manejo en casa", detail: "Indicaciones y seguimiento del promotor" },
  APPOINTMENT: { label: "Cita prioritaria", detail: "Control en el puesto de salud" },
  REFERRAL: { label: "Remisión", detail: "A un nivel de mayor complejidad" },
  EMERGENCY: { label: "Traslado urgente", detail: "Red de urgencias / ambulancia" },
} as const;

export type CarePlanKey = keyof typeof CARE_PLANS;

/** Municipios sugeridos (piloto). Es una lista de ayuda: se puede escribir cualquier municipio. */
export const MUNICIPIOS = [
  "Fusagasugá",
  "Silvania",
  "Tibacuy",
  "Pasca",
  "Arbeláez",
  "San Bernardo",
  "Cabrera",
  "Venecia",
  "Pandi",
  "Granada",
];
