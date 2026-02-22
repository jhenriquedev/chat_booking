import { z } from "zod";
import { paginationSchema } from "../../../../shared/dtos.js";

export { errorResponseSchema, messageResponseSchema } from "../../../../shared/dtos.js";
export { paginationSchema };

const userRoles = ["USER", "OPERATOR", "TENANT", "OWNER"] as const;

// ========== USER PROFILE (response) ==========

/** Perfil do usuário retornado nas respostas */
export const userProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  role: z.enum(userRoles),
  active: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type UserProfile = z.infer<typeof userProfileSchema>;

// ========== UPDATE MY PROFILE ==========

/** PATCH /api/users/me — Request Body */
export const updateMyProfileRequestSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(255).optional(),
  email: z.string().email("E-mail inválido").max(255).nullable().optional(),
});
export type UpdateMyProfileRequest = z.infer<typeof updateMyProfileRequestSchema>;

// ========== UPDATE USER (admin) ==========

/** PATCH /api/users/:id — Request Body */
export const updateUserRequestSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(255).optional(),
  email: z.string().email("E-mail inválido").max(255).nullable().optional(),
  role: z.enum(userRoles).optional(),
  active: z.boolean().optional(),
});
export type UpdateUserRequest = z.infer<typeof updateUserRequestSchema>;

// ========== LIST USERS ==========

/** GET /api/users — Query Params */
export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(userRoles).optional(),
  active: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  search: z.string().max(255).optional(),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

/** GET /api/users — Response Body */
export const paginatedUsersResponseSchema = z.object({
  data: z.array(userProfileSchema),
  pagination: paginationSchema,
});
export type PaginatedUsersResponse = z.infer<typeof paginatedUsersResponseSchema>;

// ========== CREATE OWNER ==========

/** POST /api/users/owner — Request Body */
export const createOwnerRequestSchema = z.object({
  /** Telefone internacional — ex: +5511999999999 */
  phone: z.string().min(1, "Telefone é obrigatório").max(20),
  /** Nome do owner (opcional — usa o telefone se não informado) */
  name: z.string().min(1).max(255).optional(),
});
export type CreateOwnerRequest = z.infer<typeof createOwnerRequestSchema>;

// ========== UPDATE OWNER ==========

/** PATCH /api/users/owner/:id — Request Body */
export const updateOwnerRequestSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(255).optional(),
  email: z.string().email("E-mail inválido").max(255).nullable().optional(),
  active: z.boolean().optional(),
});
export type UpdateOwnerRequest = z.infer<typeof updateOwnerRequestSchema>;
