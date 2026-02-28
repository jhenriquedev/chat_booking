import { randomUUID } from "node:crypto";
import type { Context, Next } from "hono";
import { createMiddleware } from "hono/factory";
import { type SessionPayload, getSession } from "../session/session.guard.js";
import { logger } from "./logger.js";

const CORRELATION_HEADER = "X-Correlation-ID";

/**
 * Extrai o correlation ID do contexto Hono.
 *
 * Uso nos services/repositories:
 * ```ts
 * const correlationId = getCorrelationId(c);
 * ```
 */
export const getCorrelationId = (c: Context): string => {
  return c.get("correlationId") as string;
};

/**
 * Middleware de logs estruturados com correlation ID.
 *
 * - Lê `X-Correlation-ID` do request (ex: vindo do n8n) ou gera um UUID
 * - Injeta no contexto do Hono para uso em qualquer camada
 * - Retorna no header de response para rastreamento
 * - Loga method, path, status, duração e contexto de sessão
 */
export const loggerMiddleware = createMiddleware(async (c: Context, next: Next) => {
  const correlationId = c.req.header(CORRELATION_HEADER) ?? randomUUID();

  c.set("correlationId", correlationId);
  c.header(CORRELATION_HEADER, correlationId);

  const start = Date.now();

  await next();

  const duration = Date.now() - start;

  let session: Partial<SessionPayload> = {};
  try {
    const payload = getSession(c);
    if (payload) session = payload;
  } catch {
    // rota pública, sem sessão
  }

  const method = c.req.method;
  const path = c.req.path;
  const status = c.res.status;

  const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";

  logger[level](`${method} ${path} ${status} ${duration}ms`, {
    correlationId,
    method,
    path,
    status,
    duration,
    userId: session.sub,
    role: session.role,
    tenantId: session.tenantId ?? undefined,
    userAgent: c.req.header("user-agent"),
  });
});
