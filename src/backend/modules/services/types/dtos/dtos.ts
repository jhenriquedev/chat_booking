import { z } from "zod";
import { paginationSchema } from "../../../../shared/dtos.js";

export { errorResponseSchema, messageResponseSchema } from "../../../../shared/dtos.js";
export { paginationSchema };

// ========== SERVICE PROFILE (response) ==========

/** Perfil do service retornado nas respostas */
export const serviceProfileSchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  durationMinutes: z.number().int(),
  priceCents: z.number().int(),
  active: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ServiceProfile = z.infer<typeof serviceProfileSchema>;

// ========== CREATE SERVICE ==========

/** POST /api/services — Request Body */
export const createServiceRequestSchema = z.object({
  businessId: z.string().uuid("businessId deve ser um UUID válido"),
  name: z.string().min(1, "Nome é obrigatório").max(255),
  description: z.string().optional(),
  durationMinutes: z
    .number()
    .int("Duração deve ser um número inteiro")
    .positive("Duração deve ser maior que zero"),
  priceCents: z
    .number()
    .int("Preço deve ser um número inteiro")
    .nonnegative("Preço não pode ser negativo"),
});
export type CreateServiceRequest = z.infer<typeof createServiceRequestSchema>;

// ========== UPDATE SERVICE ==========

/** PATCH /api/services/:id — Request Body */
export const updateServiceRequestSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  durationMinutes: z
    .number()
    .int("Duração deve ser um número inteiro")
    .positive("Duração deve ser maior que zero")
    .optional(),
  priceCents: z
    .number()
    .int("Preço deve ser um número inteiro")
    .nonnegative("Preço não pode ser negativo")
    .optional(),
  active: z.boolean().optional(),
});
export type UpdateServiceRequest = z.infer<typeof updateServiceRequestSchema>;

// ========== LIST SERVICES ==========

/** GET /api/services — Query Params */
export const listServicesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  businessId: z.string().uuid("businessId deve ser um UUID válido"),
  active: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});
export type ListServicesQuery = z.infer<typeof listServicesQuerySchema>;

/** GET /api/services — Response Body */
export const paginatedServicesResponseSchema = z.object({
  data: z.array(serviceProfileSchema),
  pagination: paginationSchema,
});
export type PaginatedServicesResponse = z.infer<typeof paginatedServicesResponseSchema>;
