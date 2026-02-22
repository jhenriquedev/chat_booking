import { z } from "zod";

/** Regex para validar formato HH:MM */
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Status possíveis de um slot */
const slotStatuses = ["AVAILABLE", "BOOKED", "BLOCKED"] as const;

/** Schema de validação do ScheduleSlot */
export const scheduleSlotEntitySchema = z
  .object({
    /** UUID v4 */
    id: z.string().uuid(),
    /** ID do operador dono do slot */
    operatorId: z.string().uuid(),
    /** Data do slot — formato YYYY-MM-DD */
    date: z.string().date("Formato deve ser YYYY-MM-DD"),
    /** Hora de início — formato HH:MM */
    startTime: z.string().regex(timeRegex, "Formato deve ser HH:MM"),
    /** Hora de fim — formato HH:MM */
    endTime: z.string().regex(timeRegex, "Formato deve ser HH:MM"),
    /** Status: AVAILABLE, BOOKED ou BLOCKED */
    status: z.enum(slotStatuses),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "Hora de início deve ser anterior à hora de fim",
    path: ["endTime"],
  });

/** Entidade ScheduleSlot — slot concreto na agenda do operador */
export type ScheduleSlotEntity = z.infer<typeof scheduleSlotEntitySchema>;
