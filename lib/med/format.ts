/** Formatos para mostrar datos clínicos (servidor y cliente). Zona horaria de Colombia. */

export const TZ = "America/Bogota";
export const DAY_MS = 86_400_000;

export const caseCode = (n: number) => `TMR-${String(n).padStart(6, "0")}`;

/** Edad cumplida a una fecha. */
export function ageAt(birth: Date, at: Date = new Date()) {
  let years = at.getUTCFullYear() - birth.getUTCFullYear();
  const m = at.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && at.getUTCDate() < birth.getUTCDate())) years--;
  return years;
}

export function ageText(birth: Date, at: Date = new Date()) {
  const years = ageAt(birth, at);
  if (years >= 2) return `${years} años`;
  const months = Math.max(0, (at.getUTCFullYear() - birth.getUTCFullYear()) * 12 + at.getUTCMonth() - birth.getUTCMonth() - (at.getUTCDate() < birth.getUTCDate() ? 1 : 0));
  return months === 1 ? "1 mes" : `${months} meses`;
}

const fechaHora = new Intl.DateTimeFormat("es-CO", { timeZone: TZ, day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const fecha = new Intl.DateTimeFormat("es-CO", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" });
const fechaUtc = new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
const hora = new Intl.DateTimeFormat("es-CO", { timeZone: TZ, hour: "numeric", minute: "2-digit" });

export const fmtFechaHora = (d: Date) => fechaHora.format(d);
export const fmtFecha = (d: Date) => fecha.format(d);
export const fmtHora = (d: Date) => hora.format(d);
/** Fechas sin hora guardadas como DATE (nacimiento). */
export const fmtFechaDia = (d: Date) => fechaUtc.format(d);

/** «hace 3 h», «hace 2 días»… */
export function hace(d: Date, now: number = Date.now()) {
  const min = Math.round((now - d.getTime()) / 60_000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const days = Math.round(h / 24);
  return days === 1 ? "hace 1 día" : `hace ${days} días`;
}

/** Duración legible entre dos fechas («2 h 15 min»). */
export function duracion(ms: number) {
  const min = Math.max(0, Math.round(ms / 60_000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 48) return min % 60 ? `${h} h ${min % 60} min` : `${h} h`;
  return `${Math.round(h / 24)} días`;
}

export const decimal = (v: number, digits = 1) => v.toLocaleString("es-CO", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const fullName = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`;

/** Hora del servidor para la petición actual (las páginas se renderizan por request). */
export const nowMs = () => Date.now();
