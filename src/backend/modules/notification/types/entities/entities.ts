import { z } from "zod";
import { notificationChannels, notificationStatuses, notificationTypes } from "../enums/enums.js";

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
