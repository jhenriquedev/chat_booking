import { z } from "zod";

/** Resposta padrao de erro (mesma shape do error.handler.ts) */
export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

/** Metadados de paginação reutilizados em list responses */
export const paginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

/** Resposta simples com mensagem (delete, update status, etc.) */
export const messageResponseSchema = z.object({
  message: z.string(),
});
