import { boolean, char, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { chatBookingSchema, userRoleEnum } from "../schema.js";

/** Usuários do sistema — qualquer pessoa que interage com a plataforma */
export const users = chatBookingSchema.table("users", {
  /** Identificador único (UUID v4) */
  id: uuid("id").primaryKey().defaultRandom(),
  /** Nome completo do usuário */
  name: varchar("name", { length: 255 }).notNull(),
  /** Telefone em formato internacional — ex: +5511999999999 */
  phone: varchar("phone", { length: 20 }).notNull(),
  /** Hash do telefone para busca rápida e segura (unique) */
  phoneHash: char("phone_hash", { length: 64 }).notNull().unique(),
  /** E-mail opcional para notificações */
  email: varchar("email", { length: 255 }),
  /** Papel no sistema: USER, OPERATOR, TENANT ou OWNER */
  role: userRoleEnum("role").notNull().default("USER"),
  /** Soft delete — false desativa o acesso sem remover dados */
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
