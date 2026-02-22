import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ZodError } from "zod";
import type { AppError } from "../result/result.js";

type ErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

const STATUS_MAP: Record<string, ContentfulStatusCode> = {
  // Auth
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  INVALID_TOKEN: 401,
  TOKEN_EXPIRED: 401,

  // Validação
  VALIDATION_ERROR: 422,

  // Recursos
  NOT_FOUND: 404,
  ALREADY_EXISTS: 409,
  CONFLICT: 409,

  // Negócio
  BUSINESS_RULE_VIOLATION: 422,

  // Infraestrutura
  DB_QUERY_FAILED: 500,
  EXTERNAL_SERVICE_ERROR: 502,
};

/**
 * Mapeia um AppError.code para o HTTP status correspondente.
 * Códigos não mapeados retornam 500.
 *
 * Convenção: se o code contém "NOT_FOUND" retorna 404,
 * se contém "ALREADY_EXISTS" retorna 409, etc.
 */
const resolveStatus = (code: string): ContentfulStatusCode => {
  if (STATUS_MAP[code]) return STATUS_MAP[code];

  if (code.includes("NOT_FOUND")) return 404;
  if (code.includes("ALREADY_EXISTS") || code.includes("CONFLICT")) return 409;
  if (code.includes("UNAUTHORIZED") || code.includes("TOKEN")) return 401;
  if (code.includes("FORBIDDEN")) return 403;
  if (code.includes("VALIDATION")) return 422;

  return 500;
};

/**
 * Responde um AppError (Result.fail) com formato padronizado.
 *
 * Uso no handler:
 * ```ts
 * const result = await service.findById(id);
 * if (result.isErr()) return respondError(c, result.error);
 * ```
 */
export const respondError = (c: Context, appError: AppError) => {
  const status = resolveStatus(appError.code);
  const body: ErrorResponse = {
    error: {
      code: appError.code,
      message: appError.message,
      ...(process.env.NODE_ENV !== "production" && appError.details
        ? { details: appError.details }
        : {}),
    },
  };
  return c.json(body, status);
};

/**
 * Error handler global para o Hono.
 * Captura exceções não tratadas e retorna resposta padronizada.
 *
 * Registrado no server.ts:
 * ```ts
 * app.onError(errorHandler);
 * ```
 */
export const errorHandler = (err: Error, c: Context) => {
  // Erro de validação do Zod (zod-openapi valida automaticamente)
  if (err instanceof ZodError) {
    const body: ErrorResponse = {
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: err.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      },
    };
    return c.json(body, 422);
  }

  // Erro de JWT (hono/jwt lança com status)
  if ("status" in err && typeof (err as Record<string, unknown>).status === "number") {
    const status = (err as Record<string, unknown>).status as number;
    if (status === 401) {
      return c.json(
        { error: { code: "UNAUTHORIZED", message: err.message || "Invalid or missing token" } },
        401,
      );
    }
  }

  // Erro genérico
  console.error("[UNHANDLED ERROR]", err);
  const body: ErrorResponse = {
    error: {
      code: "INTERNAL_ERROR",
      message: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
    },
  };
  return c.json(body, 500);
};
