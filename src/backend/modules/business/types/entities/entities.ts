import { z } from "zod";

/** Horário de um dia (open/close) */
const dayHoursSchema = z
  .object({
    open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato HH:MM (00:00-23:59)"),
    close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato HH:MM (00:00-23:59)"),
  })
  .refine((data) => data.open < data.close, {
    message: "Horário de abertura deve ser anterior ao de fechamento",
    path: ["close"],
  })
  .nullable();

/** Horário de funcionamento por dia da semana */
export const businessHoursSchema = z
  .object({
    monday: dayHoursSchema.optional(),
    tuesday: dayHoursSchema.optional(),
    wednesday: dayHoursSchema.optional(),
    thursday: dayHoursSchema.optional(),
    friday: dayHoursSchema.optional(),
    saturday: dayHoursSchema.optional(),
    sunday: dayHoursSchema.optional(),
  })
  .nullable();

/** URLs de redes sociais */
export const socialLinksSchema = z
  .record(z.string(), z.string().max(500))
  .refine((data) => Object.keys(data).length <= 20, {
    message: "Máximo de 20 redes sociais",
  })
  .nullable();
