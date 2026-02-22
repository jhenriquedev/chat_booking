import type { RefreshTokenEntity } from "../entities/entities.js";

/** Row do refresh_tokens retornada pelo Drizzle */
export type RefreshTokenRow = {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
};

/** Row do users (subset necessário para auth) */
export type UserRow = {
  id: string;
  name: string;
  phone: string;
  phoneHash: string;
  email: string | null;
  role: "USER" | "OPERATOR" | "TENANT" | "OWNER";
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/** Converte row do DB para RefreshTokenEntity */
export function toRefreshTokenEntity(row: RefreshTokenRow): RefreshTokenEntity {
  return {
    id: row.id,
    userId: row.userId,
    token: row.token,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
  };
}
