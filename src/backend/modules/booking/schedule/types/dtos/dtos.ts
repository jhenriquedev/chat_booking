import { z } from "zod";

export { errorResponseSchema, messageResponseSchema } from "../../../../../shared/dtos.js";

/** Regex para validar formato YYYY-MM-DD */
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

/** Valida que a string é uma data real (não aceita "2025-13-45") */
function isValidDate(value: string): boolean {
  if (!dateRegex.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
}

// ========== SCHEDULE SLOT PROFILE (response) ==========

/** Perfil do slot retornado nas respostas */
export const scheduleSlotProfileSchema = z.object({
  id: z.string().uuid(),
  operatorId: z.string().uuid(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  status: z.enum(["AVAILABLE", "BOOKED", "BLOCKED"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ScheduleSlotProfile = z.infer<typeof scheduleSlotProfileSchema>;

// ========== GENERATE SLOTS ==========

/** POST /api/schedule/generate — Request Body */
export const generateSlotsRequestSchema = z
  .object({
    operatorId: z.string().uuid("operatorId deve ser um UUID válido"),
    dateFrom: z
      .string()
      .regex(dateRegex, "Formato deve ser YYYY-MM-DD")
      .refine(isValidDate, "Data inválida"),
    dateTo: z
      .string()
      .regex(dateRegex, "Formato deve ser YYYY-MM-DD")
      .refine(isValidDate, "Data inválida"),
    durationMinutes: z
      .number()
      .int("Duração deve ser um número inteiro")
      .min(5, "Duração mínima é 5 minutos")
      .max(480, "Duração máxima é 480 minutos"),
  })
  .refine((data) => data.dateFrom <= data.dateTo, {
    message: "Data inicial deve ser anterior ou igual à data final",
    path: ["dateTo"],
  });
export type GenerateSlotsRequest = z.infer<typeof generateSlotsRequestSchema>;

/** POST /api/schedule/generate — Response Body */
export const generateSlotsResponseSchema = z.object({
  generated: z.number().int(),
  message: z.string(),
});
export type GenerateSlotsResponse = z.infer<typeof generateSlotsResponseSchema>;

// ========== LIST SLOTS ==========

/** GET /api/schedule — Query Params */
export const listSlotsQuerySchema = z.object({
  operatorId: z.string().uuid("operatorId deve ser um UUID válido"),
  date: z
    .string()
    .regex(dateRegex, "Formato deve ser YYYY-MM-DD")
    .refine(isValidDate, "Data inválida"),
  status: z.enum(["AVAILABLE", "BOOKED", "BLOCKED"]).optional(),
});
export type ListSlotsQuery = z.infer<typeof listSlotsQuerySchema>;

// ========== UPDATE SLOT STATUS ==========

/** PATCH /api/schedule/:id — Request Body */
export const updateSlotStatusRequestSchema = z.object({
  status: z.enum(["AVAILABLE", "BLOCKED"], {
    errorMap: () => ({ message: "Status deve ser AVAILABLE ou BLOCKED" }),
  }),
});
export type UpdateSlotStatusRequest = z.infer<typeof updateSlotStatusRequestSchema>;
