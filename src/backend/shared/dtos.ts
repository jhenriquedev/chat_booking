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

/**
 * Valida CNPJ (com ou sem mascara).
 * Aceita "12.345.678/0001-90" ou "12345678000190".
 * Verifica os dois digitos verificadores.
 */
function isValidCnpj(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const calc = (length: number): number => {
    let sum = 0;
    let weight = length - 7;
    for (let i = 0; i < length; i++) {
      sum += Number(digits[i]) * weight--;
      if (weight < 2) weight = 9;
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  return calc(12) === Number(digits[12]) && calc(13) === Number(digits[13]);
}

/** Schema de CNPJ reutilizavel (com ou sem mascara) */
export const cnpjSchema = z.string().max(18).refine(isValidCnpj, "CNPJ invalido");

/** Lista de timezones IANA validos (cacheada no startup) */
const validTimezones = new Set(Intl.supportedValuesOf("timeZone"));

/** Schema de timezone IANA reutilizavel */
export const timezoneSchema = z
  .string()
  .max(100)
  .refine((v) => validTimezones.has(v), "Timezone IANA invalido");
