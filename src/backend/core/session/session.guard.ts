import type { Context, Next } from "hono";
import { createMiddleware } from "hono/factory";
import { jwt } from "hono/jwt";
import { config } from "../config/config.js";

export const Roles = {
  OWNER: "OWNER",
  TENANT: "TENANT",
  OPERATOR: "OPERATOR",
  USER: "USER",
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];

export type SessionPayload = {
  sub: string;
  role: Role;
  tenantId: string | null;
  businessId: string | null;
};

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
  return c.get("jwtPayload") as SessionPayload;
};

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
