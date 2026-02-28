import { and, count, eq, sql } from "drizzle-orm";
import type { Container } from "../../core/container/container.js";
import type { Result } from "../../core/result/result.js";
import { Result as R } from "../../core/result/result.js";
import type { Role } from "../../core/session/session.guard.js";
import {
  businesses,
  operatorServices,
  operators,
  services,
  tenants,
  users,
} from "../../shared/schemas/index.js";
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
  update(
    id: string,
    data: Partial<
      Omit<OperatorRow, "id" | "userId" | "businessId" | "tenantId" | "createdAt" | "updatedAt">
    >,
  ): Promise<Result<OperatorRow>>;
  findUserById(userId: string): Promise<Result<{ id: string; role: string } | null>>;
  findBusinessById(businessId: string): Promise<Result<{ id: string; tenantId: string } | null>>;
  findServiceById(serviceId: string): Promise<Result<{ id: string; businessId: string } | null>>;
  findOperatorService(
    operatorId: string,
    serviceId: string,
  ): Promise<Result<OperatorServiceRow | null>>;
  createOperatorService(
    data: Omit<OperatorServiceRow, "id" | "active" | "createdAt" | "updatedAt">,
  ): Promise<Result<OperatorServiceRow>>;
  softDeleteOperatorService(operatorId: string, serviceId: string): Promise<Result<void>>;
  createWithRolePromotion(
    data: Omit<OperatorRow, "id" | "active" | "createdAt" | "updatedAt">,
  ): Promise<Result<OperatorRow>>;
  findTenantByUserId(userId: string): Promise<Result<{ id: string } | null>>;
  softDeleteWithRoleRevert(id: string, userId: string, previousRole: Role): Promise<Result<void>>;
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
        const rows = await db
          .select()
          .from(operators)
          .where(and(eq(operators.userId, userId), eq(operators.active, true)))
          .limit(1);
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

    async update(id, data) {
      return R.fromAsync(async () => {
        const rows = await db
          .update(operators)
          .set({ ...data, updatedAt: sql`now()` })
          .where(eq(operators.id, id))
          .returning();
        if (!rows[0]) throw new Error("Update não retornou registro");
        return rows[0];
      }, "DB_QUERY_FAILED");
    },

    async findUserById(userId) {
      return R.fromAsync(async () => {
        const rows = await db
          .select({ id: users.id, role: users.role })
          .from(users)
          .where(and(eq(users.id, userId), eq(users.active, true)))
          .limit(1);
        return rows[0] ?? null;
      }, "DB_QUERY_FAILED");
    },

    async findBusinessById(businessId) {
      return R.fromAsync(async () => {
        const rows = await db
          .select({ id: businesses.id, tenantId: businesses.tenantId })
          .from(businesses)
          .where(and(eq(businesses.id, businessId), eq(businesses.active, true)))
          .limit(1);
        return rows[0] ?? null;
      }, "DB_QUERY_FAILED");
    },

    async findServiceById(serviceId) {
      return R.fromAsync(async () => {
        const rows = await db
          .select({ id: services.id, businessId: services.businessId })
          .from(services)
          .where(and(eq(services.id, serviceId), eq(services.active, true)))
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
        if (!rows[0]) throw new Error("Insert não retornou registro");
        return rows[0];
      }, "DB_QUERY_FAILED");
    },

    async softDeleteOperatorService(operatorId, serviceId) {
      return R.fromAsync(async () => {
        await db
          .update(operatorServices)
          .set({ active: false, updatedAt: sql`now()` })
          .where(
            and(
              eq(operatorServices.operatorId, operatorId),
              eq(operatorServices.serviceId, serviceId),
              eq(operatorServices.active, true),
            ),
          );
      }, "DB_QUERY_FAILED");
    },

    /**
     * Cria um operador e promove o usuário associado para role OPERATOR
     * de forma atômica. A reversão do role em caso de remoção do operador
     * é feita por `softDeleteWithRoleRevert`.
     */
    async createWithRolePromotion(data) {
      return R.fromAsync(async () => {
        return db.transaction(async (tx) => {
          const rows = await tx
            .insert(operators)
            .values({
              userId: data.userId,
              businessId: data.businessId,
              tenantId: data.tenantId,
              displayName: data.displayName,
              canEditService: data.canEditService,
            })
            .returning();
          if (!rows[0]) throw new Error("Insert não retornou registro");

          await tx
            .update(users)
            .set({ role: "OPERATOR" as const, updatedAt: sql`now()` })
            .where(eq(users.id, data.userId));

          return rows[0];
        });
      }, "DB_QUERY_FAILED");
    },

    async findTenantByUserId(userId) {
      return R.fromAsync(async () => {
        const rows = await db
          .select({ id: tenants.id })
          .from(tenants)
          .where(and(eq(tenants.userId, userId), eq(tenants.active, true)))
          .limit(1);
        return rows[0] ?? null;
      }, "DB_QUERY_FAILED");
    },

    /**
     * Desativa o operador e restaura o role anterior do usuário
     * (USER ou TENANT), garantindo consistência entre tabela de operadores
     * e role armazenado em users.
     */
    async softDeleteWithRoleRevert(id, userId, previousRole) {
      return R.fromAsync(async () => {
        await db.transaction(async (tx) => {
          await tx
            .update(operators)
            .set({ active: false, updatedAt: sql`now()` })
            .where(eq(operators.id, id));

          await tx
            .update(users)
            .set({
              role: previousRole,
              updatedAt: sql`now()`,
            })
            .where(eq(users.id, userId));
        });
      }, "DB_QUERY_FAILED");
    },
  };
}
