import { index, integer, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { appointmentStatusEnum, chatBookingSchema } from "../schema.js";
import { businesses } from "./businesses.js";
import { operators } from "./operators.js";
import { scheduleSlots } from "./schedule-slots.js";
import { services } from "./services.js";
import { users } from "./users.js";

/** Agendamento — registro de um atendimento entre usuário e operador */
export const appointments = chatBookingSchema.table(
  "appointments",
  {
    /** Identificador único (UUID v4) */
    id: uuid("id").primaryKey().defaultRandom(),
    /** Cliente que fez o agendamento */
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    /** Profissional que vai atender */
    operatorId: uuid("operator_id")
      .notNull()
      .references(() => operators.id),
    /** Estabelecimento onde o atendimento ocorre */
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    /** Serviço contratado */
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id),
    /** Slot da agenda que originou este agendamento (nullable para dados legados) */
    slotId: uuid("slot_id").references(() => scheduleSlots.id),
    /** Data/hora agendada para o atendimento */
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    /** Snapshot da duração no momento do agendamento (em minutos) */
    durationMinutes: integer("duration_minutes").notNull(),
    /** Snapshot do preço no momento do agendamento (em centavos) */
    priceCents: integer("price_cents").notNull(),
    /** Status do ciclo de vida: PENDING → CONFIRMED → COMPLETED / CANCELLED / NO_SHOW */
    status: appointmentStatusEnum("status").notNull().default("PENDING"),
    /** Observações livres do cliente ou operador */
    notes: text("notes"),
    /** Timestamp de quando foi cancelado (null se não cancelado) */
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    /** Timestamp de quando foi concluído (null se não concluído) */
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_appointments_user_id").on(t.userId),
    index("idx_appointments_operator_id").on(t.operatorId),
    index("idx_appointments_business_id").on(t.businessId),
  ],
);
