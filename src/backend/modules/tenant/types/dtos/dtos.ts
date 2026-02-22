import { z } from "zod";
import { paginationSchema } from "../../../../shared/dtos.js";

export { errorResponseSchema, messageResponseSchema } from "../../../../shared/dtos.js";
export { paginationSchema };

// ========== TENANT PROFILE (response) ==========

/** Perfil do tenant retornado nas respostas */
export const tenantProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  userName: z.string(),
  userPhone: z.string(),
  active: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type TenantProfile = z.infer<typeof tenantProfileSchema>;

// ========== CREATE TENANT ==========

/** POST /api/tenants — Request Body */
export const createTenantRequestSchema = z.object({
  /** Telefone internacional — ex: +5511999999999 */
  phone: z.string().min(1, "Telefone é obrigatório").max(20),
  /** Nome do tenant (opcional — usa o telefone se não informado) */
  name: z.string().min(1).max(255).optional(),
});
export type CreateTenantRequest = z.infer<typeof createTenantRequestSchema>;

// ========== UPDATE TENANT ==========

/** PATCH /api/tenants/:id — Request Body */
export const updateTenantRequestSchema = z.object({
  active: z.boolean().optional(),
});
export type UpdateTenantRequest = z.infer<typeof updateTenantRequestSchema>;

// ========== LIST TENANTS ==========

/** GET /api/tenants — Query Params */
export const listTenantsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  active: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});
export type ListTenantsQuery = z.infer<typeof listTenantsQuerySchema>;

/** GET /api/tenants — Response Body */
export const paginatedTenantsResponseSchema = z.object({
  data: z.array(tenantProfileSchema),
  pagination: paginationSchema,
});
export type PaginatedTenantsResponse = z.infer<typeof paginatedTenantsResponseSchema>;
