import { and, count, eq, sql } from "drizzle-orm";
import type { Container } from "../../core/container/container.js";
import type { Result } from "../../core/result/result.js";
import { Result as R } from "../../core/result/result.js";
import { users } from "../user/schema.js";
import { tenants } from "./schema.js";
import type { TenantRow, TenantWithUserRow } from "./types/models/models.js";

/** Row mínima do user retornada nas operações internas do tenant */
type UserRow = {
  id: string;
  name: string;
  phone: string;
  phoneHash: string;
  role: string;
};

export interface ITenantRepository {
  findById(id: string): Promise<Result<TenantWithUserRow | null>>;
  findByUserId(userId: string): Promise<Result<TenantRow | null>>;
  findAll(params: {
    page: number;
    limit: number;
    active?: boolean;
  }): Promise<Result<{ data: TenantWithUserRow[]; total: number }>>;
  create(userId: string): Promise<Result<TenantRow>>;
  update(id: string, data: Partial<Pick<TenantRow, "active">>): Promise<Result<TenantRow>>;
  softDelete(id: string): Promise<Result<void>>;
  findUserByPhoneHash(phoneHash: string): Promise<Result<UserRow | null>>;
  createUser(data: { name: string; phone: string; phoneHash: string; role: string }): Promise<
    Result<UserRow>
  >;
  updateUserRole(userId: string, role: string): Promise<Result<void>>;
}

export function createTenantRepository(container: Container): ITenantRepository {
  const { db } = container;

  /** SELECT com JOIN em users para trazer nome e telefone */
  function baseSelectWithUser() {
    return db
      .select({
        id: tenants.id,
        userId: tenants.userId,
        active: tenants.active,
        createdAt: tenants.createdAt,
        updatedAt: tenants.updatedAt,
        userName: users.name,
        userPhone: users.phone,
      })
      .from(tenants)
      .innerJoin(users, eq(tenants.userId, users.id));
  }

  return {
    async findById(id) {
      return R.fromAsync(async () => {
        const rows = await baseSelectWithUser().where(eq(tenants.id, id)).limit(1);
        return rows[0] ?? null;
      }, "DB_QUERY_FAILED");
    },

    async findByUserId(userId) {
      return R.fromAsync(async () => {
        const rows = await db.select().from(tenants).where(eq(tenants.userId, userId)).limit(1);
        return rows[0] ?? null;
      }, "DB_QUERY_FAILED");
    },

    async findAll(params) {
      return R.fromAsync(async () => {
        const conditions = [];
        if (params.active !== undefined) {
          conditions.push(eq(tenants.active, params.active));
        }

        const where = conditions.length > 0 ? and(...conditions) : undefined;
        const offset = (params.page - 1) * params.limit;

        const [rows, totalResult] = await Promise.all([
          baseSelectWithUser()
            .where(where)
            .orderBy(tenants.createdAt)
            .limit(params.limit)
            .offset(offset),
          db.select({ total: count() }).from(tenants).where(where),
        ]);

        return { data: rows, total: totalResult[0]?.total ?? 0 };
      }, "DB_QUERY_FAILED");
    },

    async create(userId) {
      return R.fromAsync(async () => {
        const rows = await db.insert(tenants).values({ userId }).returning();
        return rows[0];
      }, "DB_QUERY_FAILED");
    },

    async update(id, data) {
      return R.fromAsync(async () => {
        const rows = await db
          .update(tenants)
          .set({ ...data, updatedAt: sql`now()` })
          .where(eq(tenants.id, id))
          .returning();
        return rows[0];
      }, "DB_QUERY_FAILED");
    },

    async softDelete(id) {
      return R.fromAsync(async () => {
        await db
          .update(tenants)
          .set({ active: false, updatedAt: sql`now()` })
          .where(eq(tenants.id, id));
      }, "DB_QUERY_FAILED");
    },

    async findUserByPhoneHash(phoneHash) {
      return R.fromAsync(async () => {
        const rows = await db
          .select({
            id: users.id,
            name: users.name,
            phone: users.phone,
            phoneHash: users.phoneHash,
            role: users.role,
          })
          .from(users)
          .where(eq(users.phoneHash, phoneHash))
          .limit(1);
        return rows[0] ?? null;
      }, "DB_QUERY_FAILED");
    },

    async createUser(data) {
      return R.fromAsync(async () => {
        const rows = await db
          .insert(users)
          .values({
            name: data.name,
            phone: data.phone,
            phoneHash: data.phoneHash,
            role: data.role as "USER" | "OPERATOR" | "TENANT" | "OWNER",
          })
          .returning({
            id: users.id,
            name: users.name,
            phone: users.phone,
            phoneHash: users.phoneHash,
            role: users.role,
          });
        return rows[0];
      }, "DB_QUERY_FAILED");
    },

    async updateUserRole(userId, role) {
      return R.fromAsync(async () => {
        await db
          .update(users)
          .set({ role: role as "USER" | "OPERATOR" | "TENANT" | "OWNER", updatedAt: sql`now()` })
          .where(eq(users.id, userId));
      }, "DB_QUERY_FAILED");
    },
  };
}
