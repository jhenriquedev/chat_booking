import { boolean, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { chatBookingSchema } from "../../shared/schema.js";
import { tenants } from "../tenant/schema.js";

/** Business — estabelecimento (barbearia, estética, etc.) pertencente a um tenant */
export const businesses = chatBookingSchema.table("businesses", {
  /** Identificador único (UUID v4) */
  id: uuid("id").primaryKey().defaultRandom(),
  /** Tenant proprietário deste negócio */
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  /** Nome do estabelecimento — ex: "Barbearia do João" */
  name: varchar("name", { length: 255 }).notNull(),
  /** Slug único para URL amigável — ex: "barbearia-do-joao" */
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  /** Telefone de contato do estabelecimento */
  phone: varchar("phone", { length: 20 }),
  /** Endereço completo em texto livre */
  address: text("address"),
  /** Soft delete — false oculta o negócio para novos agendamentos */
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
