import { z } from "zod";

/** Horário de um dia (open/close) */
const dayHoursSchema = z
  .object({
    open: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM"),
    close: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM"),
  })
  .nullable();

/** Horário de funcionamento por dia da semana */
export const businessHoursSchema = z
  .object({
    monday: dayHoursSchema.optional(),
    tuesday: dayHoursSchema.optional(),
    wednesday: dayHoursSchema.optional(),
    thursday: dayHoursSchema.optional(),
    friday: dayHoursSchema.optional(),
    saturday: dayHoursSchema.optional(),
    sunday: dayHoursSchema.optional(),
  })
  .nullable();

/** URLs de redes sociais */
export const socialLinksSchema = z.record(z.string(), z.string()).nullable();

/** Schema de validação do Business */
export const businessEntitySchema = z.object({
  /** UUID v4 */
  id: z.string().uuid(),
  /** ID do tenant proprietário */
  tenantId: z.string().uuid(),
  /** Nome do estabelecimento */
  name: z.string().min(1, "Nome é obrigatório").max(255),
  /** Slug para URL amigável — lowercase, sem espaços */
  slug: z
    .string()
    .min(1, "Slug é obrigatório")
    .max(255)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug deve conter apenas letras minúsculas, números e hífens",
    ),
  /** Telefone de contato do estabelecimento */
  phone: z.string().max(20).nullable(),
  /** E-mail de contato */
  email: z.string().email().max(255).nullable(),
  /** CNPJ formatado */
  cnpj: z.string().max(18).nullable(),
  /** URL do site */
  website: z.string().max(500).nullable(),
  /** Endereço completo */
  address: z.string().nullable(),
  /** Descrição do negócio */
  description: z.string().nullable(),
  /** URL ou base64 da logo */
  logoUrl: z.string().nullable(),
  /** URL ou base64 da imagem de capa */
  coverUrl: z.string().nullable(),
  /** Horário de funcionamento */
  businessHours: businessHoursSchema,
  /** URLs de redes sociais */
  socialLinks: socialLinksSchema,
  /** Ativo — false oculta o negócio */
  active: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/** Entidade Business — objeto de valor validado */
export type BusinessEntity = z.infer<typeof businessEntitySchema>;

/** Valida dados e retorna um BusinessEntity */
export function validateBusiness(data: unknown): BusinessEntity {
  return businessEntitySchema.parse(data);
}
