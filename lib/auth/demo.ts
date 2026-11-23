/**
 * Cuentas creadas por `npm run db:seed` (contraseña demo1234).
 * El acceso rápido solo se muestra en desarrollo.
 */
export const DEMO_PASSWORD = "demo1234";

export const DEMO_ACCOUNTS = [
  { email: "dra.rojas@ejemplo.co", label: "Profesional de salud", detail: "Dra. Laura Rojas · Medicina general" },
  { email: "promotor@ejemplo.co", label: "Promotor de salud", detail: "Wilson Cárdenas · Silvania" },
  { email: "coordinacion@ejemplo.co", label: "Coordinador", detail: "Patricia León · ESE regional" },
  { email: "admin@telemedrural.co", label: "Administrador", detail: "Equipo TeleMed Rural" },
] as const;

export const SHOW_DEMO_LOGIN = process.env.NODE_ENV === "development";
