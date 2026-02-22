import { date, index, time, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { chatBookingSchema, slotStatusEnum } from "../schema.js";
import { operators } from "./operators.js";

/** Slots concretos da agenda — gerados a partir das availability_rules para datas específicas */
export const scheduleSlots = chatBookingSchema.table(
  "schedule_slots",
  {
    /** Identificador único (UUID v4) */
    id: uuid("id").primaryKey().defaultRandom(),
    /** Operador dono deste slot */
    operatorId: uuid("operator_id")
      .notNull()
      .references(() => operators.id),
    /** Data do slot — ex: "2025-03-15" */
    date: date("date").notNull(),
    /** Hora de início do slot — ex: "09:00" */
    startTime: time("start_time").notNull(),
    /** Hora de fim do slot — ex: "09:30" */
    endTime: time("end_time").notNull(),
    /** Status: AVAILABLE (livre), BOOKED (ocupado), BLOCKED (bloqueado manualmente) */
    status: slotStatusEnum("status").notNull().default("AVAILABLE"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_schedule_slots_operator_date").on(t.operatorId, t.date),
    unique("uq_schedule_slots_operator_date_time").on(t.operatorId, t.date, t.startTime),
  ],
);
