import { z } from "zod";

/** Tipos de notificação */
const notificationTypes = ["CONFIRMATION", "REMINDER", "CANCELLATION", "RESCHEDULE"] as const;

/** Canais de envio */
const notificationChannels = ["WHATSAPP", "SMS", "EMAIL"] as const;

/** Status de envio */
const notificationStatuses = ["PENDING", "SENT", "FAILED"] as const;

/** Schema de validação da Notification */
export const notificationEntitySchema = z.object({
  /** UUID v4 */
  id: z.string().uuid(),
  /** ID do destinatário */
  userId: z.string().uuid(),
  /** ID do agendamento relacionado */
  appointmentId: z.string().uuid(),
  /** Tipo: CONFIRMATION, REMINDER, CANCELLATION ou RESCHEDULE */
  type: z.enum(notificationTypes),
  /** Canal: WHATSAPP, SMS ou EMAIL */
  channel: z.enum(notificationChannels),
  /** Status: PENDING → SENT ou FAILED */
  status: z.enum(notificationStatuses),
  /** Conteúdo da mensagem */
  content: z.string().min(1, "Conteúdo é obrigatório"),
  /** Quando foi enviada (null enquanto PENDING) */
  sentAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
});

/** Entidade Notification — notificação enviada ao usuário */
export type NotificationEntity = z.infer<typeof notificationEntitySchema>;

/** Valida dados e retorna um NotificationEntity */
export function validateNotification(data: unknown): NotificationEntity {
  return notificationEntitySchema.parse(data);
}
