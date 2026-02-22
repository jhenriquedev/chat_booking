import { and, count, eq, sql } from "drizzle-orm";
import type { Container } from "../../core/container/container.js";
import type { Result } from "../../core/result/result.js";
import { Result as R } from "../../core/result/result.js";
import { businesses, services } from "../../shared/schemas/index.js";
import type { ServiceRow } from "./types/models/models.js";

export interface IServiceRepository {
  findById(id: string): Promise<Result<ServiceRow | null>>;
  findAll(params: {
    page: number;
    limit: number;
    businessId: string;
    active?: boolean;
  }): Promise<Result<{ data: ServiceRow[]; total: number }>>;
  create(
    data: Omit<ServiceRow, "id" | "active" | "createdAt" | "updatedAt">,
  ): Promise<Result<ServiceRow>>;
  update(
    id: string,
    data: Partial<Omit<ServiceRow, "id" | "businessId" | "createdAt" | "updatedAt">>,
  ): Promise<Result<ServiceRow>>;
  softDelete(id: string): Promise<Result<void>>;
  findBusinessById(businessId: string): Promise<Result<{ id: string; tenantId: string } | null>>;
}

export function createServiceRepository(container: Container): IServiceRepository {
  const { db } = container;

  return {
    async findById(id) {
      return R.fromAsync(async () => {
        const rows = await db.select().from(services).where(eq(services.id, id)).limit(1);
        return rows[0] ?? null;
      }, "DB_QUERY_FAILED");
    },

    async findAll(params) {
      return R.fromAsync(async () => {
        const conditions = [eq(services.businessId, params.businessId)];
        if (params.active !== undefined) {
          conditions.push(eq(services.active, params.active));
        }

        const where = and(...conditions);
        const offset = (params.page - 1) * params.limit;

        const [rows, totalResult] = await Promise.all([
          db
            .select()
            .from(services)
            .where(where)
            .orderBy(services.createdAt)
            .limit(params.limit)
            .offset(offset),
          db.select({ total: count() }).from(services).where(where),
        ]);

        return { data: rows, total: totalResult[0]?.total ?? 0 };
      }, "DB_QUERY_FAILED");
    },

    async create(data) {
      return R.fromAsync(async () => {
        const rows = await db
          .insert(services)
          .values({
            businessId: data.businessId,
            name: data.name,
            description: data.description,
            durationMinutes: data.durationMinutes,
            priceCents: data.priceCents,
          })
          .returning();
        if (!rows[0]) throw new Error("Insert não retornou registro");
        return rows[0];
      }, "DB_QUERY_FAILED");
    },

    async update(id, data) {
      return R.fromAsync(async () => {
        const rows = await db
          .update(services)
          .set({ ...data, updatedAt: sql`now()` })
          .where(eq(services.id, id))
          .returning();
        if (!rows[0]) throw new Error("Update não retornou registro");
        return rows[0];
      }, "DB_QUERY_FAILED");
    },

    async softDelete(id) {
      return R.fromAsync(async () => {
        await db
          .update(services)
          .set({ active: false, updatedAt: sql`now()` })
          .where(eq(services.id, id));
      }, "DB_QUERY_FAILED");
    },

    async findBusinessById(businessId) {
      return R.fromAsync(async () => {
        const rows = await db
          .select({ id: businesses.id, tenantId: businesses.tenantId })
          .from(businesses)
          .where(eq(businesses.id, businessId))
          .limit(1);
        return rows[0] ?? null;
      }, "DB_QUERY_FAILED");
    },
  };
}
