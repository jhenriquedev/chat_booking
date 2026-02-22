import { z } from "zod";

/** Schema de validação do RefreshToken */
export const refreshTokenEntitySchema = z.object({
  /** UUID v4 */
  id: z.string().uuid(),
  /** ID do usuário dono do token */
  userId: z.string().uuid(),
  /** Token opaco (hash) para renovar o access token */
  token: z.string().min(1, "Token é obrigatório").max(512),
  /** Data/hora de expiração */
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date(),
});

/** Entidade RefreshToken — objeto de valor validado */
export type RefreshTokenEntity = z.infer<typeof refreshTokenEntitySchema>;
