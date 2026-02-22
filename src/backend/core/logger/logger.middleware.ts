import { randomUUID } from "node:crypto";
import type { Context, Next } from "hono";
import { createMiddleware } from "hono/factory";
import { getSession, type SessionPayload } from "../session/session.guard.js";

const CORRELATION_HEADER = "X-Correlation-ID";

type LogEntry = {
  correlationId: string;
  timestamp: string;
  method: string;
  path: string;
  status: number;
  duration: number;
  userId?: string;
  role?: string;
  tenantId?: string;
  userAgent?: string;
};

const formatLog = (entry: LogEntry): string => {
  const user = entry.userId ? `[${entry.role}:${entry.userId}]` : "[anonymous]";
  const tenant = entry.tenantId ? `[tenant:${entry.tenantId}]` : "";
  const status =
    entry.status >= 400
      ? `\x1b[31m${entry.status}\x1b[0m`
      : `\x1b[32m${entry.status}\x1b[0m`;

  return `${entry.timestamp} [${entry.correlationId}] ${entry.method} ${entry.path} ${status} ${entry.duration}ms ${user} ${tenant}`.trim();
};

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
    session = getSession(c);
  } catch {
    // rota pública, sem sessão
  }

  const entry: LogEntry = {
    correlationId,
    timestamp: new Date().toISOString(),
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration,
    userId: session.sub,
    role: session.role,
    tenantId: session.tenantId ?? undefined,
    userAgent: c.req.header("user-agent"),
  };

  console.log(formatLog(entry));
});
