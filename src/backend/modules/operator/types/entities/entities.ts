import { z } from "zod";

/** Schema de validação do Operator */
export const operatorEntitySchema = z.object({
  /** UUID v4 */
  id: z.string().uuid(),
  /** ID do usuário vinculado (role OPERATOR) */
  userId: z.string().uuid(),
  /** ID da business onde trabalha */
  businessId: z.string().uuid(),
  /** ID do tenant proprietário */
  tenantId: z.string().uuid(),
  /** Nome de exibição na agenda */
  displayName: z.string().min(1, "Nome de exibição é obrigatório").max(255),
  /** Permite editar preço/duração em operator_services — false = apenas tenant edita */
  canEditService: z.boolean(),
  /** Ativo — false remove da agenda */
  active: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/** Entidade Operator — objeto de valor validado */
export type OperatorEntity = z.infer<typeof operatorEntitySchema>;

/** Schema de validação do OperatorService */
export const operatorServiceEntitySchema = z.object({
  /** UUID v4 */
  id: z.string().uuid(),
  /** ID do operador */
  operatorId: z.string().uuid(),
  /** ID do serviço */
  serviceId: z.string().uuid(),
  /** Override de preço em centavos — null usa o padrão do service */
  priceCents: z.number().int().nonnegative("Preço não pode ser negativo").nullable(),
  /** Override de duração em minutos — null usa o padrão do service */
  durationMinutes: z.number().int().positive("Duração deve ser maior que zero").nullable(),
  /** Ativo — false desvincula o serviço */
  active: z.boolean(),
  createdAt: z.coerce.date(),
});

/** Entidade OperatorService — vínculo operador ↔ serviço com override opcional */
export type OperatorServiceEntity = z.infer<typeof operatorServiceEntitySchema>;
