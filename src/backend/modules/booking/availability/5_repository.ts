import { and, eq, gt, lt, sql } from "drizzle-orm";
import type { Container } from "../../../core/container/container.js";
import type { Result } from "../../../core/result/result.js";
import { Result as R } from "../../../core/result/result.js";
import { availabilityRules, operators } from "../../../shared/schemas/index.js";
import type { AvailabilityRuleRow } from "./types/models/models.js";

export interface IAvailabilityRepository {
  findById(id: string): Promise<Result<AvailabilityRuleRow | null>>;
  findByOperator(operatorId: string, active?: boolean): Promise<Result<AvailabilityRuleRow[]>>;
  findOverlapping(
    operatorId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    excludeId?: string,
  ): Promise<Result<AvailabilityRuleRow | null>>;
  create(
    data: Omit<AvailabilityRuleRow, "id" | "active" | "createdAt" | "updatedAt">,
  ): Promise<Result<AvailabilityRuleRow>>;
  update(
    id: string,
    data: Partial<Omit<AvailabilityRuleRow, "id" | "operatorId" | "createdAt" | "updatedAt">>,
  ): Promise<Result<AvailabilityRuleRow>>;
  softDelete(id: string): Promise<Result<void>>;
  findOperatorById(
    operatorId: string,
  ): Promise<Result<{ id: string; userId: string; tenantId: string } | null>>;
}

export function createAvailabilityRepository(container: Container): IAvailabilityRepository {
  const { db } = container;

  return {
    async findById(id) {
      return R.fromAsync(async () => {
        const rows = await db
          .select()
          .from(availabilityRules)
          .where(eq(availabilityRules.id, id))
          .limit(1);
        return rows[0] ?? null;
      }, "DB_QUERY_FAILED");
    },

    async findByOperator(operatorId, active) {
      return R.fromAsync(async () => {
        const conditions = [eq(availabilityRules.operatorId, operatorId)];
        if (active !== undefined) {
          conditions.push(eq(availabilityRules.active, active));
        }

        return db
          .select()
          .from(availabilityRules)
          .where(and(...conditions))
          .orderBy(availabilityRules.dayOfWeek, availabilityRules.startTime);
      }, "DB_QUERY_FAILED");
    },

    async findOverlapping(operatorId, dayOfWeek, startTime, endTime, excludeId) {
      return R.fromAsync(async () => {
        const conditions = [
          eq(availabilityRules.operatorId, operatorId),
          eq(availabilityRules.dayOfWeek, dayOfWeek),
          eq(availabilityRules.active, true),
          lt(availabilityRules.startTime, endTime),
          gt(availabilityRules.endTime, startTime),
        ];

        if (excludeId) {
          conditions.push(sql`${availabilityRules.id} != ${excludeId}`);
        }

        const rows = await db
          .select()
          .from(availabilityRules)
          .where(and(...conditions))
          .limit(1);
        return rows[0] ?? null;
      }, "DB_QUERY_FAILED");
    },

    async create(data) {
      return R.fromAsync(async () => {
        const rows = await db
          .insert(availabilityRules)
          .values({
            operatorId: data.operatorId,
            dayOfWeek: data.dayOfWeek,
            startTime: data.startTime,
            endTime: data.endTime,
          })
          .returning();
        if (!rows[0]) throw new Error("Insert não retornou registro");
        return rows[0];
      }, "DB_QUERY_FAILED");
    },

    async update(id, data) {
      return R.fromAsync(async () => {
        const rows = await db
          .update(availabilityRules)
          .set({ ...data, updatedAt: sql`now()` })
          .where(eq(availabilityRules.id, id))
          .returning();
        if (!rows[0]) throw new Error("Update não retornou registro");
        return rows[0];
      }, "DB_QUERY_FAILED");
    },

    async softDelete(id) {
      return R.fromAsync(async () => {
        await db
          .update(availabilityRules)
          .set({ active: false, updatedAt: sql`now()` })
          .where(eq(availabilityRules.id, id));
      }, "DB_QUERY_FAILED");
    },

    async findOperatorById(operatorId) {
      return R.fromAsync(async () => {
        const rows = await db
          .select({
            id: operators.id,
            userId: operators.userId,
            tenantId: operators.tenantId,
          })
          .from(operators)
          .where(eq(operators.id, operatorId))
          .limit(1);
        return rows[0] ?? null;
      }, "DB_QUERY_FAILED");
    },
  };
}
