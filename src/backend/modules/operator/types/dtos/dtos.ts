import { z } from "zod";
import { paginationSchema } from "../../../../shared/dtos.js";

export { errorResponseSchema, messageResponseSchema } from "../../../../shared/dtos.js";
export { paginationSchema };

// ========== OPERATOR PROFILE (response) ==========

/** Perfil do operador retornado nas respostas */
export const operatorProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  businessId: z.string().uuid(),
  tenantId: z.string().uuid(),
  displayName: z.string(),
  canEditService: z.boolean(),
  active: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type OperatorProfile = z.infer<typeof operatorProfileSchema>;

// ========== CREATE OPERATOR ==========

/** POST /api/operators — Request Body */
export const createOperatorRequestSchema = z.object({
  userId: z.string().uuid("userId deve ser um UUID válido"),
  businessId: z.string().uuid("businessId deve ser um UUID válido"),
  displayName: z.string().min(1, "Nome de exibição é obrigatório").max(255),
  canEditService: z.boolean().optional(),
  /** Apenas OWNER pode informar o tenantId; TENANT usa o próprio */
  tenantId: z.string().uuid().optional(),
});
export type CreateOperatorRequest = z.infer<typeof createOperatorRequestSchema>;

// ========== UPDATE OPERATOR ==========

/** PATCH /api/operators/:id — Request Body */
export const updateOperatorRequestSchema = z.object({
  displayName: z.string().min(1).max(255).optional(),
  canEditService: z.boolean().optional(),
  active: z.boolean().optional(),
});
export type UpdateOperatorRequest = z.infer<typeof updateOperatorRequestSchema>;

// ========== LIST OPERATORS ==========

/** GET /api/operators — Query Params */
export const listOperatorsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  businessId: z.string().uuid("businessId deve ser um UUID válido"),
  active: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});
export type ListOperatorsQuery = z.infer<typeof listOperatorsQuerySchema>;

/** GET /api/operators — Response Body */
export const paginatedOperatorsResponseSchema = z.object({
  data: z.array(operatorProfileSchema),
  pagination: paginationSchema,
});
export type PaginatedOperatorsResponse = z.infer<typeof paginatedOperatorsResponseSchema>;

// ========== OPERATOR SERVICE (response) ==========

/** Vínculo operador-serviço retornado nas respostas */
export const operatorServiceProfileSchema = z.object({
  id: z.string().uuid(),
  operatorId: z.string().uuid(),
  serviceId: z.string().uuid(),
  priceCents: z.number().int().nullable(),
  durationMinutes: z.number().int().nullable(),
  active: z.boolean(),
  createdAt: z.string().datetime(),
});
export type OperatorServiceProfile = z.infer<typeof operatorServiceProfileSchema>;

// ========== LINK SERVICE ==========

/** POST /api/operators/:id/services — Request Body */
export const linkServiceRequestSchema = z.object({
  serviceId: z.string().uuid("serviceId deve ser um UUID válido"),
  priceCents: z
    .number()
    .int("Preço deve ser um número inteiro")
    .nonnegative("Preço não pode ser negativo")
    .optional(),
  durationMinutes: z
    .number()
    .int("Duração deve ser um número inteiro")
    .positive("Duração deve ser maior que zero")
    .optional(),
});
export type LinkServiceRequest = z.infer<typeof linkServiceRequestSchema>;
