import { boolean, jsonb, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { chatBookingSchema } from "../schema.js";
import { tenants } from "./tenants.js";

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
  /** E-mail de contato */
  email: varchar("email", { length: 255 }),
  /** CNPJ formatado — ex: "12.345.678/0001-90" */
  cnpj: varchar("cnpj", { length: 18 }),
  /** URL do site do estabelecimento */
  website: varchar("website", { length: 500 }),
  /** Endereço completo em texto livre */
  address: text("address"),
  /** Descrição do negócio */
  description: text("description"),
  /** URL ou base64 da logo */
  logoUrl: text("logo_url"),
  /** URL ou base64 da imagem de capa */
  coverUrl: text("cover_url"),
  /** Horário de funcionamento por dia da semana (JSONB) */
  businessHours: jsonb("business_hours"),
  /** URLs de redes sociais (JSONB) */
  socialLinks: jsonb("social_links"),
  /** Soft delete — false oculta o negócio para novos agendamentos */
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
