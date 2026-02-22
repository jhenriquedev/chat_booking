import { timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { chatBookingSchema } from "../schema.js";
import { users } from "./users.js";

/** Refresh tokens — armazena tokens de renovação de sessão JWT */
export const refreshTokens = chatBookingSchema.table("refresh_tokens", {
  /** Identificador único (UUID v4) */
  id: uuid("id").primaryKey().defaultRandom(),
  /** Usuário dono do token */
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  /** Token opaco (hash) — usado para renovar o access token */
  token: varchar("token", { length: 512 }).notNull().unique(),
  /** Data/hora de expiração — após essa data o token é inválido */
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
