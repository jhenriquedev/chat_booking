import { z } from "zod";
import { paginationSchema } from "../../../../../shared/dtos.js";

export { errorResponseSchema } from "../../../../../shared/dtos.js";
export { paginationSchema };

const appointmentStatuses = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"] as const;

/** Regex para validar formato YYYY-MM-DD */
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

/** Valida que a string é uma data real (não aceita "2025-13-45") */
function isValidDate(value: string): boolean {
  if (!dateRegex.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
}

// ========== APPOINTMENT PROFILE (response) ==========

/** Perfil do agendamento retornado nas respostas */
export const appointmentProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  operatorId: z.string().uuid(),
  businessId: z.string().uuid(),
  serviceId: z.string().uuid(),
  slotId: z.string().uuid().nullable(),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().int(),
  priceCents: z.number().int(),
  status: z.enum(appointmentStatuses),
  notes: z.string().nullable(),
  cancelledAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AppointmentProfile = z.infer<typeof appointmentProfileSchema>;

// ========== CREATE APPOINTMENT ==========

/** POST /api/appointments — Request Body */
export const createAppointmentRequestSchema = z.object({
  slotId: z.string().uuid("slotId deve ser um UUID válido"),
  serviceId: z.string().uuid("serviceId deve ser um UUID válido"),
  notes: z.string().max(1000).optional(),
});
export type CreateAppointmentRequest = z.infer<typeof createAppointmentRequestSchema>;

// ========== LIST APPOINTMENTS ==========

/** GET /api/appointments — Query Params */
export const listAppointmentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(appointmentStatuses).optional(),
  dateFrom: z
    .string()
    .regex(dateRegex, "Formato deve ser YYYY-MM-DD")
    .refine(isValidDate, "Data inválida")
    .optional(),
  dateTo: z
    .string()
    .regex(dateRegex, "Formato deve ser YYYY-MM-DD")
    .refine(isValidDate, "Data inválida")
    .optional(),
  operatorId: z.string().uuid().optional(),
  businessId: z.string().uuid().optional(),
});
export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>;

/** GET /api/appointments — Response Body */
export const paginatedAppointmentsResponseSchema = z.object({
  data: z.array(appointmentProfileSchema),
  pagination: paginationSchema,
});
export type PaginatedAppointmentsResponse = z.infer<typeof paginatedAppointmentsResponseSchema>;

// ========== CANCEL APPOINTMENT ==========

/** PATCH /api/appointments/:id/cancel — Request Body */
export const cancelAppointmentRequestSchema = z.object({
  reason: z.string().max(1000).optional(),
});
export type CancelAppointmentRequest = z.infer<typeof cancelAppointmentRequestSchema>;
