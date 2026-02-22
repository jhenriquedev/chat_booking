import { and, eq, sql } from "drizzle-orm";
import type { Container } from "../../../core/container/container.js";
import type { Result } from "../../../core/result/result.js";
import { Result as R } from "../../../core/result/result.js";
import { availabilityRules, operators, scheduleSlots } from "../../../shared/schemas/index.js";
import type { ScheduleSlotRow } from "./types/models/models.js";

export interface IScheduleRepository {
  findById(id: string): Promise<Result<ScheduleSlotRow | null>>;
  findByOperatorAndDate(
    operatorId: string,
    date: string,
    status?: string,
  ): Promise<Result<ScheduleSlotRow[]>>;
  findExistingSlots(operatorId: string, date: string): Promise<Result<ScheduleSlotRow[]>>;
  createMany(
    slots: Omit<ScheduleSlotRow, "id" | "status" | "createdAt" | "updatedAt">[],
  ): Promise<Result<number>>;
  updateStatus(id: string, status: "AVAILABLE" | "BLOCKED"): Promise<Result<ScheduleSlotRow>>;
  deleteSlot(id: string): Promise<Result<void>>;
  findOperatorById(
    operatorId: string,
  ): Promise<Result<{ id: string; userId: string; tenantId: string } | null>>;
  findActiveAvailabilityRules(
    operatorId: string,
  ): Promise<Result<{ dayOfWeek: number; startTime: string; endTime: string }[]>>;
}

export function createScheduleRepository(container: Container): IScheduleRepository {
  const { db } = container;

  return {
    async findById(id) {
      return R.fromAsync(async () => {
        const rows = await db.select().from(scheduleSlots).where(eq(scheduleSlots.id, id)).limit(1);
        return rows[0] ?? null;
      }, "DB_QUERY_FAILED");
    },

    async findByOperatorAndDate(operatorId, date, status) {
      return R.fromAsync(async () => {
        const conditions = [eq(scheduleSlots.operatorId, operatorId), eq(scheduleSlots.date, date)];
        if (status) {
          conditions.push(eq(scheduleSlots.status, status as "AVAILABLE" | "BOOKED" | "BLOCKED"));
        }

        return db
          .select()
          .from(scheduleSlots)
          .where(and(...conditions))
          .orderBy(scheduleSlots.startTime);
      }, "DB_QUERY_FAILED");
    },

    async findExistingSlots(operatorId, date) {
      return R.fromAsync(async () => {
        return db
          .select()
          .from(scheduleSlots)
          .where(and(eq(scheduleSlots.operatorId, operatorId), eq(scheduleSlots.date, date)))
          .orderBy(scheduleSlots.startTime);
      }, "DB_QUERY_FAILED");
    },

    async createMany(slots) {
      return R.fromAsync(async () => {
        if (slots.length === 0) return 0;

        const values = slots.map((s) => ({
          operatorId: s.operatorId,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
        }));

        const rows = await db
          .insert(scheduleSlots)
          .values(values)
          .onConflictDoNothing()
          .returning();
        return rows.length;
      }, "DB_QUERY_FAILED");
    },

    async updateStatus(id, status) {
      return R.fromAsync(async () => {
        const rows = await db
          .update(scheduleSlots)
          .set({ status, updatedAt: sql`now()` })
          .where(eq(scheduleSlots.id, id))
          .returning();
        if (!rows[0]) throw new Error("Update não retornou registro");
        return rows[0];
      }, "DB_QUERY_FAILED");
    },

    async deleteSlot(id) {
      return R.fromAsync(async () => {
        await db.delete(scheduleSlots).where(eq(scheduleSlots.id, id));
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
          .where(and(eq(operators.id, operatorId), eq(operators.active, true)))
          .limit(1);
        return rows[0] ?? null;
      }, "DB_QUERY_FAILED");
    },

    async findActiveAvailabilityRules(operatorId) {
      return R.fromAsync(async () => {
        return db
          .select({
            dayOfWeek: availabilityRules.dayOfWeek,
            startTime: availabilityRules.startTime,
            endTime: availabilityRules.endTime,
          })
          .from(availabilityRules)
          .where(
            and(eq(availabilityRules.operatorId, operatorId), eq(availabilityRules.active, true)),
          )
          .orderBy(availabilityRules.dayOfWeek, availabilityRules.startTime);
      }, "DB_QUERY_FAILED");
    },
  };
}
