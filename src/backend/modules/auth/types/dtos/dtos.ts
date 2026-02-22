import { z } from "zod";
import { phoneSchema } from "../../../../shared/dtos.js";

// ========== LOGIN ==========

/** POST /api/auth/login — Request Body */
export const loginRequestSchema = z.object({
  /** Telefone internacional — ex: +5511999999999 */
  phone: phoneSchema,
  /** Nome do usuário (opcional, usado no auto-cadastro) */
  name: z.string().min(1).max(255).optional(),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

/** Dados do usuário retornados no login */
export const loginUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  phone: z.string(),
  role: z.enum(["USER", "OPERATOR", "TENANT", "OWNER"]),
  active: z.boolean(),
});
export type LoginUser = z.infer<typeof loginUserSchema>;

/** POST /api/auth/login — Response Body */
export const loginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  /** Tempo de expiração do access token em segundos */
  expiresIn: z.number(),
  user: loginUserSchema,
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;

// ========== REFRESH ==========

/** POST /api/auth/refresh — Request Body */
export const refreshRequestSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token é obrigatório"),
});
export type RefreshRequest = z.infer<typeof refreshRequestSchema>;

/** POST /api/auth/refresh — Response Body */
export const refreshResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  /** Tempo de expiração do access token em segundos */
  expiresIn: z.number(),
});
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;

// ========== LOGOUT ==========

/** POST /api/auth/logout — Response Body */
export const logoutResponseSchema = z.object({
  message: z.string(),
});
export type LogoutResponse = z.infer<typeof logoutResponseSchema>;

// ========== ERROR ==========

export { errorResponseSchema } from "../../../../shared/dtos.js";
