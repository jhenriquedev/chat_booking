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

/** Schema de telefone reutilizavel (formato internacional) */
export const phoneSchema = z
  .string()
  .min(1, "Telefone e obrigatorio")
  .max(20)
  .regex(/^\+?\d{10,15}$/, "Formato de telefone invalido");
