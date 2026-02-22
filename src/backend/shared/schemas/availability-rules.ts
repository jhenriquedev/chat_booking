import { boolean, index, integer, time, timestamp, uuid } from "drizzle-orm/pg-core";
import { chatBookingSchema } from "../schema.js";
import { operators } from "./operators.js";

/** Regras de disponibilidade recorrente — define os horários semanais do operador */
export const availabilityRules = chatBookingSchema.table(
  "availability_rules",
  {
    /** Identificador único (UUID v4) */
    id: uuid("id").primaryKey().defaultRandom(),
    /** Operador dono desta regra de disponibilidade */
    operatorId: uuid("operator_id")
      .notNull()
      .references(() => operators.id),
    /** Dia da semana (0 = domingo, 1 = segunda, ..., 6 = sábado) */
    dayOfWeek: integer("day_of_week").notNull(),
    /** Hora de início do expediente — ex: "09:00" */
    startTime: time("start_time").notNull(),
    /** Hora de fim do expediente — ex: "18:00" */
    endTime: time("end_time").notNull(),
    /** Soft delete — false desativa a regra sem remover */
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_availability_rules_operator_id").on(t.operatorId)],
);
