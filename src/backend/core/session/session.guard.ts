import type { Context, Next } from "hono";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { jwt } from "hono/jwt";
import { z } from "zod";
import { config } from "../config/config.js";

export const Roles = {
  OWNER: "OWNER",
  TENANT: "TENANT",
  OPERATOR: "OPERATOR",
  USER: "USER",
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];

const sessionPayloadSchema = z.object({
  sub: z.string(),
  role: z.enum(["OWNER", "TENANT", "OPERATOR", "USER"]),
  tenantId: z.string().nullable(),
  businessId: z.string().nullable(),
});

export type SessionPayload = z.infer<typeof sessionPayloadSchema>;

/**
 * Middleware de autenticação JWT.
 * Valida o token do header Authorization e injeta o payload no contexto.
 *
 * Uso:
 * ```ts
 * app.use("/api/*", sessionGuard);
 * ```
 */
export const sessionGuard = jwt({
  secret: config.JWT_SECRET,
  alg: "HS256",
});

/**
 * Helper para extrair o payload tipado do contexto.
 *
 * Uso:
 * ```ts
 * const session = getSession(c);
 * console.log(session.sub, session.role);
 * ```
 */
export const getSession = (c: Context): SessionPayload => {
  const raw = c.get("jwtPayload");
  const parsed = sessionPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    throw new HTTPException(401, { message: "Token inválido: payload malformado" });
  }
  return parsed.data;
};

/** Verifica se a sessão possui uma das roles permitidas */
export function hasRole(session: { role: Role }, ...allowed: Role[]): boolean {
  return allowed.includes(session.role);
}

/**
 * Middleware de autorização por role.
 * Deve ser usado APÓS `sessionGuard`.
 *
 * Uso:
 * ```ts
 * app.use("/api/tenant/*", sessionGuard, requireRole("TENANT", "OWNER"));
 * ```
 */
export const requireRole = (...allowed: Role[]) => {
  return createMiddleware(async (c: Context, next: Next) => {
    const session = getSession(c);

    if (!allowed.includes(session.role)) {
      return c.json({ error: "Forbidden", message: "Insufficient permissions" }, 403);
    }

    await next();
  });
};
