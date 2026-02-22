import { text, timestamp, uuid } from "drizzle-orm/pg-core";
import {
  chatBookingSchema,
  notificationChannelEnum,
  notificationStatusEnum,
  notificationTypeEnum,
} from "../schema.js";
import { appointments } from "./appointments.js";
import { users } from "./users.js";

/** Notificações enviadas ao usuário sobre seus agendamentos */
export const notifications = chatBookingSchema.table("notifications", {
  /** Identificador único (UUID v4) */
  id: uuid("id").primaryKey().defaultRandom(),
  /** Destinatário da notificação */
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  /** Agendamento relacionado a esta notificação */
  appointmentId: uuid("appointment_id")
    .notNull()
    .references(() => appointments.id),
  /** Tipo: CONFIRMATION, REMINDER, CANCELLATION ou RESCHEDULE */
  type: notificationTypeEnum("type").notNull(),
  /** Canal de envio: WHATSAPP, SMS ou EMAIL */
  channel: notificationChannelEnum("channel").notNull(),
  /** Status de envio: PENDING → SENT ou FAILED */
  status: notificationStatusEnum("status").notNull().default("PENDING"),
  /** Conteúdo da mensagem enviada */
  content: text("content").notNull(),
  /** Timestamp de quando foi enviada (null enquanto PENDING) */
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
