import { z } from "zod";

/** Regex para validar formato HH:MM */
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Schema de validação do AvailabilityRule */
export const availabilityRuleEntitySchema = z
  .object({
    /** UUID v4 */
    id: z.string().uuid(),
    /** ID do operador dono da regra */
    operatorId: z.string().uuid(),
    /** Dia da semana: 0 = domingo, 6 = sábado */
    dayOfWeek: z
      .number()
      .int()
      .min(0, "Dia mínimo é 0 (domingo)")
      .max(6, "Dia máximo é 6 (sábado)"),
    /** Hora de início — formato HH:MM */
    startTime: z.string().regex(timeRegex, "Formato deve ser HH:MM"),
    /** Hora de fim — formato HH:MM */
    endTime: z.string().regex(timeRegex, "Formato deve ser HH:MM"),
    /** Ativo — false desativa a regra */
    active: z.boolean(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "Hora de início deve ser anterior à hora de fim",
    path: ["endTime"],
  });

/** Entidade AvailabilityRule — horário recorrente semanal do operador */
export type AvailabilityRuleEntity = z.infer<typeof availabilityRuleEntitySchema>;
