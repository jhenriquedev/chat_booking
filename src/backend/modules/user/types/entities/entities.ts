import { z } from "zod";

/** Roles válidos no sistema */
const userRoles = ["USER", "OPERATOR", "TENANT", "OWNER"] as const;

/** Schema de validação do User */
export const userEntitySchema = z.object({
  /** UUID v4 */
  id: z.string().uuid(),
  /** Nome completo — mín. 1 caractere */
  name: z.string().min(1, "Nome é obrigatório").max(255),
  /** Telefone internacional — ex: +5511999999999 */
  phone: z.string().min(1, "Telefone é obrigatório").max(20),
  /** Hash do telefone para busca segura */
  phoneHash: z.string().min(1).max(128),
  /** E-mail opcional */
  email: z.string().email("E-mail inválido").max(255).nullable(),
  /** Papel no sistema */
  role: z.enum(userRoles),
  /** Ativo no sistema */
  active: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/** Entidade User — objeto de valor validado */
export type UserEntity = z.infer<typeof userEntitySchema>;

/** Valida dados e retorna um UserEntity */
export function validateUser(data: unknown): UserEntity {
  return userEntitySchema.parse(data);
}
