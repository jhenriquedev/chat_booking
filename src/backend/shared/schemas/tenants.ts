import { boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { chatBookingSchema } from "../schema.js";
import { users } from "./users.js";

/** Tenant — dono de negócio(s) no sistema multi-tenant */
export const tenants = chatBookingSchema.table("tenants", {
  /** Identificador único (UUID v4) */
  id: uuid("id").primaryKey().defaultRandom(),
  /** Usuário vinculado — relação 1:1 (um user só pode ser tenant uma vez) */
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  /** Soft delete — false desativa o tenant e bloqueia acesso às businesses */
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
