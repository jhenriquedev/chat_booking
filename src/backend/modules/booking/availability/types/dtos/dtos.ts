import { z } from "zod";

export { errorResponseSchema } from "../../../../../shared/dtos.js";

/** Regex para validar formato HH:MM */
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

// ========== AVAILABILITY RULE PROFILE (response) ==========

/** Perfil da regra de disponibilidade retornado nas respostas */
export const availabilityRuleProfileSchema = z.object({
  id: z.string().uuid(),
  operatorId: z.string().uuid(),
  dayOfWeek: z.number().int(),
  startTime: z.string(),
  endTime: z.string(),
  active: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AvailabilityRuleProfile = z.infer<typeof availabilityRuleProfileSchema>;

// ========== CREATE AVAILABILITY RULE ==========

/** POST /api/availability — Request Body */
export const createAvailabilityRuleRequestSchema = z
  .object({
    operatorId: z.string().uuid("operatorId deve ser um UUID válido"),
    dayOfWeek: z
      .number()
      .int("Dia da semana deve ser inteiro")
      .min(0, "Dia mínimo é 0 (domingo)")
      .max(6, "Dia máximo é 6 (sábado)"),
    startTime: z.string().regex(timeRegex, "Formato deve ser HH:MM"),
    endTime: z.string().regex(timeRegex, "Formato deve ser HH:MM"),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "Hora de início deve ser anterior à hora de fim",
    path: ["endTime"],
  });
export type CreateAvailabilityRuleRequest = z.infer<typeof createAvailabilityRuleRequestSchema>;

// ========== UPDATE AVAILABILITY RULE ==========

/** PATCH /api/availability/:id — Request Body */
export const updateAvailabilityRuleRequestSchema = z
  .object({
    dayOfWeek: z
      .number()
      .int("Dia da semana deve ser inteiro")
      .min(0, "Dia mínimo é 0 (domingo)")
      .max(6, "Dia máximo é 6 (sábado)")
      .optional(),
    startTime: z.string().regex(timeRegex, "Formato deve ser HH:MM").optional(),
    endTime: z.string().regex(timeRegex, "Formato deve ser HH:MM").optional(),
    active: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return data.startTime < data.endTime;
      }
      return true;
    },
    {
      message: "Hora de início deve ser anterior à hora de fim",
      path: ["endTime"],
    },
  );
export type UpdateAvailabilityRuleRequest = z.infer<typeof updateAvailabilityRuleRequestSchema>;

// ========== LIST AVAILABILITY RULES ==========

/** GET /api/availability — Query Params */
export const listAvailabilityRulesQuerySchema = z.object({
  operatorId: z.string().uuid("operatorId deve ser um UUID válido"),
  active: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});
export type ListAvailabilityRulesQuery = z.infer<typeof listAvailabilityRulesQuerySchema>;

// ========== MESSAGE ==========

export const messageResponseSchema = z.object({
  message: z.string(),
});
