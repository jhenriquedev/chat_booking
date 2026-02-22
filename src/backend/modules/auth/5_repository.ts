import { and, eq, gt } from "drizzle-orm";
import type { Container } from "../../core/container/container.js";
import type { Result } from "../../core/result/result.js";
import { Result as R } from "../../core/result/result.js";
import { operators, refreshTokens, tenants, users } from "../../shared/schemas/index.js";
import type { RefreshTokenRow, UserRow } from "./types/models/models.js";

export interface IAuthRepository {
  findUserByPhoneHash(phoneHash: string): Promise<Result<UserRow | null>>;
  findUserById(userId: string): Promise<Result<UserRow | null>>;
  createUser(data: { name: string; phone: string; phoneHash: string }): Promise<Result<UserRow>>;
  findOperatorByUserId(
    userId: string,
  ): Promise<Result<{ tenantId: string; businessId: string } | null>>;
  findTenantByUserId(userId: string): Promise<Result<{ tenantId: string } | null>>;
  createRefreshToken(data: { userId: string; token: string; expiresAt: Date }): Promise<
    Result<RefreshTokenRow>
  >;
  findRefreshTokenByHash(tokenHash: string): Promise<Result<RefreshTokenRow | null>>;
  deleteRefreshTokenById(id: string): Promise<Result<void>>;
  deleteAllRefreshTokensByUserId(userId: string): Promise<Result<void>>;
}

export function createAuthRepository(container: Container): IAuthRepository {
  const { db } = container;

  return {
    /** Busca usuário pelo hash do telefone */
    async findUserByPhoneHash(phoneHash: string) {
      return R.fromAsync(async () => {
        const rows = await db.select().from(users).where(eq(users.phoneHash, phoneHash)).limit(1);
        return rows[0] ?? null;
      }, "DB_QUERY_FAILED");
    },

    /** Busca usuário pelo id */
    async findUserById(userId: string) {
      return R.fromAsync(async () => {
        const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        return rows[0] ?? null;
      }, "DB_QUERY_FAILED");
    },

    /** Cria usuário (auto-cadastro no login) */
    async createUser(data: { name: string; phone: string; phoneHash: string }) {
      return R.fromAsync(async () => {
        const rows = await db
          .insert(users)
          .values({ name: data.name, phone: data.phone, phoneHash: data.phoneHash, role: "USER" })
          .returning();
        if (!rows[0]) throw new Error("Insert não retornou registro");
        return rows[0];
      }, "DB_QUERY_FAILED");
    },

    /** Busca operador pelo userId (para enriquecer JWT com tenantId/businessId) */
    async findOperatorByUserId(userId: string) {
      return R.fromAsync(async () => {
        const rows = await db
          .select({ tenantId: operators.tenantId, businessId: operators.businessId })
          .from(operators)
          .where(and(eq(operators.userId, userId), eq(operators.active, true)))
          .limit(1);
        return rows[0] ?? null;
      }, "DB_QUERY_FAILED");
    },

    /** Busca tenant pelo userId (para enriquecer JWT com tenantId) */
    async findTenantByUserId(userId: string) {
      return R.fromAsync(async () => {
        const rows = await db
          .select({ tenantId: tenants.id })
          .from(tenants)
          .where(and(eq(tenants.userId, userId), eq(tenants.active, true)))
          .limit(1);
        return rows[0] ?? null;
      }, "DB_QUERY_FAILED");
    },

    /** Armazena hash do refresh token */
    async createRefreshToken(data: { userId: string; token: string; expiresAt: Date }) {
      return R.fromAsync(async () => {
        const rows = await db.insert(refreshTokens).values(data).returning();
        if (!rows[0]) throw new Error("Insert não retornou registro");
        return rows[0];
      }, "DB_QUERY_FAILED");
    },

    /** Busca refresh token válido (não expirado) pelo hash */
    async findRefreshTokenByHash(tokenHash: string) {
      return R.fromAsync(async () => {
        const rows = await db
          .select()
          .from(refreshTokens)
          .where(and(eq(refreshTokens.token, tokenHash), gt(refreshTokens.expiresAt, new Date())))
          .limit(1);
        return rows[0] ?? null;
      }, "DB_QUERY_FAILED");
    },

    /** Deleta refresh token pelo id */
    async deleteRefreshTokenById(id: string) {
      return R.fromAsync(async () => {
        await db.delete(refreshTokens).where(eq(refreshTokens.id, id));
      }, "DB_QUERY_FAILED");
    },

    /** Deleta todos os refresh tokens de um usuário (logout) */
    async deleteAllRefreshTokensByUserId(userId: string) {
      return R.fromAsync(async () => {
        await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
      }, "DB_QUERY_FAILED");
    },
  };
}
