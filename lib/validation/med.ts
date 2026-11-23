/** Validación (Zod) de los formularios clínicos del panel. Se usa en el servidor. */
import { z } from "zod";

export const noteSchema = z.object({
  caseId: z.string().min(1),
  body: z
    .string()
    .trim()
    .min(10, { error: "Escriba su observación (mínimo 10 caracteres)." })
    .max(5000, { error: "Admite hasta 5000 caracteres." }),
  carePlan: z
    .enum(["HOME_CARE", "APPOINTMENT", "REFERRAL", "EMERGENCY"])
    .or(z.literal(""))
    .transform((v) => v || null),
  markReviewed: z.boolean(),
});
