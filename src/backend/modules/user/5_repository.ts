import { and, count, eq, ilike, or, sql } from "drizzle-orm";
import type { Container } from "../../core/container/container.js";
import type { Result } from "../../core/result/result.js";
import { Result as R } from "../../core/result/result.js";
import { users } from "./schema.js";
import type { UserRow } from "./types/models/models.js";

export interface IUserRepository {
  findById(id: string): Promise<Result<UserRow | null>>;
  findByPhoneHash(phoneHash: string): Promise<Result<UserRow | null>>;
  create(data: { name: string; phone: string; phoneHash: string; role?: UserRow["role"] }): Promise<
    Result<UserRow>
  >;
  findAll(params: {
    page: number;
    limit: number;
    role?: string;
    active?: boolean;
    search?: string;
  }): Promise<Result<{ data: UserRow[]; total: number }>>;
  update(
    id: string,
    data: Partial<Pick<UserRow, "name" | "email" | "role" | "active">>,
  ): Promise<Result<UserRow>>;
  softDelete(id: string): Promise<Result<void>>;
}

export function createUserRepository(container: Container): IUserRepository {
  const { db } = container;

  return {
    async findById(id: string) {
      return R.fromAsync(async () => {
        const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
        return rows[0] ?? null;
      }, "DB_QUERY_FAILED");
    },

    async findByPhoneHash(phoneHash: string) {
      return R.fromAsync(async () => {
        const rows = await db.select().from(users).where(eq(users.phoneHash, phoneHash)).limit(1);
        return rows[0] ?? null;
      }, "DB_QUERY_FAILED");
    },

    async create(data) {
      return R.fromAsync(async () => {
        const rows = await db
          .insert(users)
          .values({
            name: data.name,
            phone: data.phone,
            phoneHash: data.phoneHash,
            role: data.role ?? "USER",
          })
          .returning();
        return rows[0];
      }, "DB_QUERY_FAILED");
    },

    async findAll(params) {
      return R.fromAsync(async () => {
        const conditions = [];

        if (params.role) {
          conditions.push(eq(users.role, params.role as UserRow["role"]));
        }
        if (params.active !== undefined) {
          conditions.push(eq(users.active, params.active));
        }
        if (params.search) {
          const term = `%${params.search}%`;
          conditions.push(or(ilike(users.name, term), ilike(users.phone, term)));
        }

        const where = conditions.length > 0 ? and(...conditions) : undefined;
        const offset = (params.page - 1) * params.limit;

        const [rows, totalResult] = await Promise.all([
          db
            .select()
            .from(users)
            .where(where)
            .orderBy(users.createdAt)
            .limit(params.limit)
            .offset(offset),
          db.select({ total: count() }).from(users).where(where),
        ]);

        return { data: rows, total: totalResult[0]?.total ?? 0 };
      }, "DB_QUERY_FAILED");
    },

    async update(id, data) {
      return R.fromAsync(async () => {
        const rows = await db
          .update(users)
          .set({ ...data, updatedAt: sql`now()` })
          .where(eq(users.id, id))
          .returning();
        return rows[0];
      }, "DB_QUERY_FAILED");
    },

    async softDelete(id) {
      return R.fromAsync(async () => {
        await db
          .update(users)
          .set({ active: false, updatedAt: sql`now()` })
          .where(eq(users.id, id));
      }, "DB_QUERY_FAILED");
    },
  };
}
