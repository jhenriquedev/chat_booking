import { z } from "zod";

/** Status possíveis de um agendamento */
const appointmentStatuses = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"] as const;

/** Schema de validação do Appointment */
export const appointmentEntitySchema = z.object({
  /** UUID v4 */
  id: z.string().uuid(),
  /** ID do cliente que agendou */
  userId: z.string().uuid(),
  /** ID do profissional que atende */
  operatorId: z.string().uuid(),
  /** ID do estabelecimento */
  businessId: z.string().uuid(),
  /** ID do serviço contratado */
  serviceId: z.string().uuid(),
  /** Data/hora agendada */
  scheduledAt: z.coerce.date(),
  /** Snapshot da duração no momento do agendamento (minutos) */
  durationMinutes: z.number().int().positive("Duração deve ser maior que zero"),
  /** Snapshot do preço no momento do agendamento (centavos) */
  priceCents: z.number().int().nonnegative("Preço não pode ser negativo"),
  /** Status do ciclo de vida: PENDING → CONFIRMED → COMPLETED / CANCELLED / NO_SHOW */
  status: z.enum(appointmentStatuses),
  /** Observações livres */
  notes: z.string().nullable(),
  /** Quando foi cancelado (null se não cancelado) */
  cancelledAt: z.coerce.date().nullable(),
  /** Quando foi concluído (null se não concluído) */
  completedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/** Entidade Appointment — registro de um atendimento */
export type AppointmentEntity = z.infer<typeof appointmentEntitySchema>;

/** Valida dados e retorna um AppointmentEntity */
export function validateAppointment(data: unknown): AppointmentEntity {
  return appointmentEntitySchema.parse(data);
}
