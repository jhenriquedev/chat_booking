import { and, count, eq, sql } from "drizzle-orm";
import type { Container } from "../../core/container/container.js";
import type { Result } from "../../core/result/result.js";
import { Result as R } from "../../core/result/result.js";
import { businesses } from "../business/schema.js";
import { services } from "../services/schema.js";
import { users } from "../user/schema.js";
import { operatorServices, operators } from "./schema.js";
import type { OperatorRow, OperatorServiceRow } from "./types/models/models.js";

export interface IOperatorRepository {
  findById(id: string): Promise<Result<OperatorRow | null>>;
  findByUserId(userId: string): Promise<Result<OperatorRow | null>>;
  findAll(params: {
    page: number;
    limit: number;
    businessId: string;
    active?: boolean;
  }): Promise<Result<{ data: OperatorRow[]; total: number }>>;
  create(
    data: Omit<OperatorRow, "id" | "active" | "createdAt" | "updatedAt">,
  ): Promise<Result<OperatorRow>>;
  update(id: string, data: Partial<OperatorRow>): Promise<Result<OperatorRow>>;
  softDelete(id: string): Promise<Result<void>>;
  findUserById(userId: string): Promise<Result<{ id: string; role: string } | null>>;
  updateUserRole(userId: string, role: string): Promise<Result<void>>;
  findBusinessById(businessId: string): Promise<Result<{ id: string; tenantId: string } | null>>;
  findServiceById(serviceId: string): Promise<Result<{ id: string; businessId: string } | null>>;
  findOperatorService(
    operatorId: string,
    serviceId: string,
  ): Promise<Result<OperatorServiceRow | null>>;
  createOperatorService(
    data: Omit<OperatorServiceRow, "id" | "active" | "createdAt">,
  ): Promise<Result<OperatorServiceRow>>;
  softDeleteOperatorService(operatorId: string, serviceId: string): Promise<Result<void>>;
}

export function createOperatorRepository(container: Container): IOperatorRepository {
  const { db } = container;

  return {
    async findById(id) {
      return R.fromAsync(async () => {
        const rows = await db.select().from(operators).where(eq(operators.id, id)).limit(1);
        return rows[0] ?? null;
      }, "DB_QUERY_FAILED");
    },

    async findByUserId(userId) {
      return R.fromAsync(async () => {
        const rows = await db.select().from(operators).where(eq(operators.userId, userId)).limit(1);
        return rows[0] ?? null;
      }, "DB_QUERY_FAILED");
    },

    async findAll(params) {
      return R.fromAsync(async () => {
        const conditions = [eq(operators.businessId, params.businessId)];
        if (params.active !== undefined) {
          conditions.push(eq(operators.active, params.active));
        }

        const where = and(...conditions);
        const offset = (params.page - 1) * params.limit;

        const [rows, totalResult] = await Promise.all([
          db
            .select()
            .from(operators)
            .where(where)
            .orderBy(operators.createdAt)
            .limit(params.limit)
            .offset(offset),
          db.select({ total: count() }).from(operators).where(where),
        ]);

        return { data: rows, total: totalResult[0]?.total ?? 0 };
      }, "DB_QUERY_FAILED");
    },

    async create(data) {
      return R.fromAsync(async () => {
        const rows = await db
          .insert(operators)
          .values({
            userId: data.userId,
            businessId: data.businessId,
            tenantId: data.tenantId,
            displayName: data.displayName,
            canEditService: data.canEditService,
          })
          .returning();
        return rows[0];
      }, "DB_QUERY_FAILED");
    },

    async update(id, data) {
      return R.fromAsync(async () => {
        const rows = await db
          .update(operators)
          .set({ ...data, updatedAt: sql`now()` })
          .where(eq(operators.id, id))
          .returning();
        return rows[0];
      }, "DB_QUERY_FAILED");
    },

    async softDelete(id) {
      return R.fromAsync(async () => {
        await db
          .update(operators)
          .set({ active: false, updatedAt: sql`now()` })
          .where(eq(operators.id, id));
      }, "DB_QUERY_FAILED");
    },

    async findUserById(userId) {
      return R.fromAsync(async () => {
        const rows = await db
          .select({ id: users.id, role: users.role })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
        return rows[0] ?? null;
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

    async findServiceById(serviceId) {
      return R.fromAsync(async () => {
        const rows = await db
          .select({ id: services.id, businessId: services.businessId })
          .from(services)
          .where(eq(services.id, serviceId))
          .limit(1);
        return rows[0] ?? null;
      }, "DB_QUERY_FAILED");
    },

    async findOperatorService(operatorId, serviceId) {
      return R.fromAsync(async () => {
        const rows = await db
          .select()
          .from(operatorServices)
          .where(
            and(
              eq(operatorServices.operatorId, operatorId),
              eq(operatorServices.serviceId, serviceId),
              eq(operatorServices.active, true),
            ),
          )
          .limit(1);
        return rows[0] ?? null;
      }, "DB_QUERY_FAILED");
    },

    async createOperatorService(data) {
      return R.fromAsync(async () => {
        const rows = await db
          .insert(operatorServices)
          .values({
            operatorId: data.operatorId,
            serviceId: data.serviceId,
            priceCents: data.priceCents,
            durationMinutes: data.durationMinutes,
          })
          .returning();
        return rows[0];
      }, "DB_QUERY_FAILED");
    },

    async softDeleteOperatorService(operatorId, serviceId) {
      return R.fromAsync(async () => {
        await db
          .update(operatorServices)
          .set({ active: false })
          .where(
            and(
              eq(operatorServices.operatorId, operatorId),
              eq(operatorServices.serviceId, serviceId),
              eq(operatorServices.active, true),
            ),
          );
      }, "DB_QUERY_FAILED");
    },
  };
}
