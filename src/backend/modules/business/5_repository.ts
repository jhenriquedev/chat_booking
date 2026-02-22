import { and, count, eq, sql } from "drizzle-orm";
import type { Container } from "../../core/container/container.js";
import type { Result } from "../../core/result/result.js";
import { Result as R } from "../../core/result/result.js";
import { businesses } from "../../shared/schemas/index.js";
import type { BusinessRow } from "./types/models/models.js";

export interface IBusinessRepository {
  findById(id: string): Promise<Result<BusinessRow | null>>;
  findBySlug(slug: string): Promise<Result<BusinessRow | null>>;
  findAll(params: {
    page: number;
    limit: number;
    active?: boolean;
    tenantId?: string;
  }): Promise<Result<{ data: BusinessRow[]; total: number }>>;
  create(
    data: Omit<BusinessRow, "id" | "active" | "createdAt" | "updatedAt">,
  ): Promise<Result<BusinessRow>>;
  update(id: string, data: Partial<BusinessRow>): Promise<Result<BusinessRow>>;
  softDelete(id: string): Promise<Result<void>>;
}

export function createBusinessRepository(container: Container): IBusinessRepository {
  const { db } = container;

  return {
    async findById(id) {
      return R.fromAsync(async () => {
        const rows = await db.select().from(businesses).where(eq(businesses.id, id)).limit(1);
        return rows[0] ?? null;
      }, "DB_QUERY_FAILED");
    },

    async findBySlug(slug) {
      return R.fromAsync(async () => {
        const rows = await db.select().from(businesses).where(eq(businesses.slug, slug)).limit(1);
        return rows[0] ?? null;
      }, "DB_QUERY_FAILED");
    },

    async findAll(params) {
      return R.fromAsync(async () => {
        const conditions = [];
        if (params.active !== undefined) {
          conditions.push(eq(businesses.active, params.active));
        }
        if (params.tenantId) {
          conditions.push(eq(businesses.tenantId, params.tenantId));
        }

        const where = conditions.length > 0 ? and(...conditions) : undefined;
        const offset = (params.page - 1) * params.limit;

        const [rows, totalResult] = await Promise.all([
          db
            .select()
            .from(businesses)
            .where(where)
            .orderBy(businesses.createdAt)
            .limit(params.limit)
            .offset(offset),
          db.select({ total: count() }).from(businesses).where(where),
        ]);

        return { data: rows, total: totalResult[0]?.total ?? 0 };
      }, "DB_QUERY_FAILED");
    },

    async create(data) {
      return R.fromAsync(async () => {
        const rows = await db
          .insert(businesses)
          .values({
            tenantId: data.tenantId,
            name: data.name,
            slug: data.slug,
            phone: data.phone,
            email: data.email,
            cnpj: data.cnpj,
            website: data.website,
            address: data.address,
            description: data.description,
            logoUrl: data.logoUrl,
            coverUrl: data.coverUrl,
            businessHours: data.businessHours,
            socialLinks: data.socialLinks,
          })
          .returning();
        if (!rows[0]) throw new Error("Insert não retornou registro");
        return rows[0];
      }, "DB_QUERY_FAILED");
    },

    async update(id, data) {
      return R.fromAsync(async () => {
        const rows = await db
          .update(businesses)
          .set({ ...data, updatedAt: sql`now()` })
          .where(eq(businesses.id, id))
          .returning();
        if (!rows[0]) throw new Error("Update não retornou registro");
        return rows[0];
      }, "DB_QUERY_FAILED");
    },

    async softDelete(id) {
      return R.fromAsync(async () => {
        await db
          .update(businesses)
          .set({ active: false, updatedAt: sql`now()` })
          .where(eq(businesses.id, id));
      }, "DB_QUERY_FAILED");
    },
  };
}
