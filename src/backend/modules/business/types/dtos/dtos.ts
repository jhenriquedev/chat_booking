import { z } from "zod";
import { cnpjSchema, paginationSchema, timezoneSchema } from "../../../../shared/dtos.js";
import { businessHoursSchema, socialLinksSchema } from "../entities/entities.js";

export { errorResponseSchema, messageResponseSchema } from "../../../../shared/dtos.js";
export { paginationSchema };

// ========== BUSINESS PROFILE (response) ==========

/** Perfil do business retornado nas respostas */
export const businessProfileSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  cnpj: z.string().nullable(),
  website: z.string().nullable(),
  address: z.string().nullable(),
  description: z.string().nullable(),
  logoUrl: z.string().nullable(),
  coverUrl: z.string().nullable(),
  businessHours: businessHoursSchema,
  socialLinks: socialLinksSchema,
  timezone: z.string(),
  active: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type BusinessProfile = z.infer<typeof businessProfileSchema>;

// ========== CREATE BUSINESS ==========

/** POST /api/businesses — Request Body */
export const createBusinessRequestSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(255),
  slug: z
    .string()
    .min(1, "Slug é obrigatório")
    .max(255)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug deve conter apenas letras minúsculas, números e hífens",
    ),
  phone: z.string().max(20).optional(),
  email: z.string().email("E-mail inválido").max(255).optional(),
  cnpj: cnpjSchema.optional(),
  website: z.string().max(500).optional(),
  address: z.string().max(1000).optional(),
  description: z.string().max(2000).optional(),
  logoUrl: z.string().max(2000).optional(),
  coverUrl: z.string().max(2000).optional(),
  businessHours: businessHoursSchema.optional(),
  socialLinks: socialLinksSchema.optional(),
  timezone: timezoneSchema.optional(),
  /** Apenas OWNER pode informar o tenantId; TENANT usa o próprio */
  tenantId: z.string().uuid().optional(),
});
export type CreateBusinessRequest = z.infer<typeof createBusinessRequestSchema>;

// ========== UPDATE BUSINESS ==========

/** PATCH /api/businesses/:id — Request Body */
export const updateBusinessRequestSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug deve conter apenas letras minúsculas, números e hífens",
    )
    .optional(),
  phone: z.string().max(20).nullable().optional(),
  email: z.string().email("E-mail inválido").max(255).nullable().optional(),
  cnpj: cnpjSchema.nullable().optional(),
  website: z.string().max(500).nullable().optional(),
  address: z.string().max(1000).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  logoUrl: z.string().max(2000).nullable().optional(),
  coverUrl: z.string().max(2000).nullable().optional(),
  businessHours: businessHoursSchema.optional(),
  socialLinks: socialLinksSchema.optional(),
  timezone: timezoneSchema.optional(),
});
export type UpdateBusinessRequest = z.infer<typeof updateBusinessRequestSchema>;

// ========== LIST BUSINESSES ==========

/** GET /api/businesses — Query Params */
export const listBusinessesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  active: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  tenantId: z.string().uuid().optional(),
});
export type ListBusinessesQuery = z.infer<typeof listBusinessesQuerySchema>;

/** GET /api/businesses — Response Body */
export const paginatedBusinessesResponseSchema = z.object({
  data: z.array(businessProfileSchema),
  pagination: paginationSchema,
});
export type PaginatedBusinessesResponse = z.infer<typeof paginatedBusinessesResponseSchema>;
