import { z } from "zod";

/** Resposta padrao de erro (mesma shape do error.handler.ts) */
export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
