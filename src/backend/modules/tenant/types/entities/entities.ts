import { z } from "zod";

/** Schema de validação do Tenant */
export const tenantEntitySchema = z.object({
  /** UUID v4 */
  id: z.string().uuid(),
  /** ID do usuário vinculado (relação 1:1) */
  userId: z.string().uuid(),
  /** Ativo no sistema — false bloqueia acesso às businesses */
  active: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/** Entidade Tenant — objeto de valor validado */
export type TenantEntity = z.infer<typeof tenantEntitySchema>;

/** Valida dados e retorna um TenantEntity */
export function validateTenant(data: unknown): TenantEntity {
  return tenantEntitySchema.parse(data);
}
