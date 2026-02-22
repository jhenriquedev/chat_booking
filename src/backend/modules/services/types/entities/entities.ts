import { z } from "zod";

/** Schema de validação do Service */
export const serviceEntitySchema = z.object({
  /** UUID v4 */
  id: z.string().uuid(),
  /** ID da business que oferece o serviço */
  businessId: z.string().uuid(),
  /** Nome do serviço — ex: "Corte + Barba" */
  name: z.string().min(1, "Nome é obrigatório").max(255),
  /** Descrição detalhada */
  description: z.string().nullable(),
  /** Duração em minutos — deve ser positivo */
  durationMinutes: z.number().int().positive("Duração deve ser maior que zero"),
  /** Preço em centavos — deve ser >= 0 */
  priceCents: z.number().int().nonnegative("Preço não pode ser negativo"),
  /** Ativo — false oculta do catálogo */
  active: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/** Entidade Service — objeto de valor validado */
export type ServiceEntity = z.infer<typeof serviceEntitySchema>;
