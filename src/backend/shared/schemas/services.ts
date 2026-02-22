import { boolean, integer, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { chatBookingSchema } from "../schema.js";
import { businesses } from "./businesses.js";

/** Serviço oferecido por uma business — ex: "Corte masculino", "Barba" */
export const services = chatBookingSchema.table("services", {
  /** Identificador único (UUID v4) */
  id: uuid("id").primaryKey().defaultRandom(),
  /** Business que oferece este serviço */
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id),
  /** Nome do serviço — ex: "Corte + Barba" */
  name: varchar("name", { length: 255 }).notNull(),
  /** Descrição detalhada do serviço (opcional) */
  description: text("description"),
  /** Duração padrão do serviço em minutos */
  durationMinutes: integer("duration_minutes").notNull(),
  /** Preço padrão em centavos (evita ponto flutuante) — ex: 5000 = R$ 50,00 */
  priceCents: integer("price_cents").notNull(),
  /** Soft delete — false oculta o serviço do catálogo */
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
