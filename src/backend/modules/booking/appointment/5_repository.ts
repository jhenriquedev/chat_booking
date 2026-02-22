import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import type { Container } from "../../../core/container/container.js";
import type { Result } from "../../../core/result/result.js";
import { Result as R } from "../../../core/result/result.js";
import { businesses } from "../../business/schema.js";
import { operatorServices, operators } from "../../operator/schema.js";
import { services } from "../../services/schema.js";
import { scheduleSlots } from "../schedule/schema.js";
import { appointments } from "./schema.js";
import type { AppointmentRow } from "./types/models/models.js";

export interface IAppointmentRepository {
  create(
    data: Omit<
      AppointmentRow,
      "id" | "status" | "cancelledAt" | "completedAt" | "createdAt" | "updatedAt"
    >,
  ): Promise<Result<AppointmentRow>>;

  findById(id: string): Promise<Result<AppointmentRow | null>>;

  findAll(params: {
    page: number;
    limit: number;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    operatorId?: string;
    businessId?: string;
    userId?: string;
    tenantId?: string;
  }): Promise<Result<{ data: AppointmentRow[]; total: number }>>;

  updateStatus(
    id: string,
    status: AppointmentRow["status"],
    extra?: { cancelledAt?: Date; completedAt?: Date; notes?: string | null },
  ): Promise<Result<AppointmentRow>>;

  findSlotById(slotId: string): Promise<
    Result<{
      id: string;
      operatorId: string;
      date: string;
      startTime: string;
      endTime: string;
      status: string;
    } | null>
  >;

  updateSlotStatus(
    slotId: string,
    status: "AVAILABLE" | "BOOKED" | "BLOCKED",
  ): Promise<Result<void>>;

  findSlotByOperatorDateAndTime(
    operatorId: string,
    date: string,
    startTime: string,
  ): Promise<Result<{ id: string; status: string } | null>>;

  findOperatorById(
    operatorId: string,
  ): Promise<Result<{ id: string; userId: string; businessId: string; tenantId: string } | null>>;

  findOperatorByUserId(
    userId: string,
  ): Promise<Result<{ id: string; userId: string; businessId: string; tenantId: string } | null>>;

  findServiceById(serviceId: string): Promise<
    Result<{
      id: string;
      businessId: string;
      durationMinutes: number;
      priceCents: number;
      active: boolean;
    } | null>
  >;

  findOperatorService(
    operatorId: string,
    serviceId: string,
  ): Promise<
    Result<{
      id: string;
      priceCents: number | null;
      durationMinutes: number | null;
      active: boolean;
    } | null>
  >;

  findBusinessById(businessId: string): Promise<Result<{ id: string; tenantId: string } | null>>;
}

export function createAppointmentRepository(container: Container): IAppointmentRepository {
  const { db } = container;

  return {
    async create(data) {
      return R.fromAsync(async () => {
        const rows = await db
          .insert(appointments)
          .values({
            userId: data.userId,
            operatorId: data.operatorId,
            businessId: data.businessId,
            serviceId: data.serviceId,
            scheduledAt: data.scheduledAt,
            durationMinutes: data.durationMinutes,
            priceCents: data.priceCents,
            notes: data.notes,
          })
          .returning();
        return rows[0];
      }, "DB_QUERY_FAILED");
    },

    async findById(id) {
      return R.fromAsync(async () => {
        const rows = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
        return rows[0] ?? null;
      }, "DB_QUERY_FAILED");
    },

    async findAll(params) {
      return R.fromAsync(async () => {
        const conditions: ReturnType<typeof eq>[] = [];

        if (params.userId) {
          conditions.push(eq(appointments.userId, params.userId));
        }
        if (params.operatorId) {
          conditions.push(eq(appointments.operatorId, params.operatorId));
        }
        if (params.businessId) {
          conditions.push(eq(appointments.businessId, params.businessId));
        }
        if (params.status) {
          conditions.push(eq(appointments.status, params.status as AppointmentRow["status"]));
        }
        if (params.dateFrom) {
          conditions.push(gte(appointments.scheduledAt, new Date(`${params.dateFrom}T00:00:00Z`)));
        }
        if (params.dateTo) {
          conditions.push(
            lte(appointments.scheduledAt, new Date(`${params.dateTo}T23:59:59.999Z`)),
          );
        }
        if (params.tenantId) {
          conditions.push(
            sql`${appointments.businessId} IN (SELECT ${businesses.id} FROM ${businesses} WHERE ${businesses.tenantId} = ${params.tenantId})`,
          );
        }

        const where = conditions.length > 0 ? and(...conditions) : undefined;
        const offset = (params.page - 1) * params.limit;

        const [data, countResult] = await Promise.all([
          db
            .select()
            .from(appointments)
            .where(where)
            .orderBy(desc(appointments.scheduledAt))
            .limit(params.limit)
            .offset(offset),
          db.select({ total: count() }).from(appointments).where(where),
        ]);

        return { data, total: countResult[0].total };
      }, "DB_QUERY_FAILED");
    },

    async updateStatus(id, status, extra) {
      return R.fromAsync(async () => {
        const rows = await db
          .update(appointments)
          .set({
            status,
            updatedAt: sql`now()`,
            ...(extra?.cancelledAt ? { cancelledAt: extra.cancelledAt } : {}),
            ...(extra?.completedAt ? { completedAt: extra.completedAt } : {}),
            ...(extra?.notes !== undefined ? { notes: extra.notes } : {}),
          })
          .where(eq(appointments.id, id))
          .returning();
        return rows[0];
      }, "DB_QUERY_FAILED");
    },

    async findSlotById(slotId) {
      return R.fromAsync(async () => {
        const rows = await db
          .select({
            id: scheduleSlots.id,
            operatorId: scheduleSlots.operatorId,
            date: scheduleSlots.date,
            startTime: scheduleSlots.startTime,
            endTime: scheduleSlots.endTime,
            status: scheduleSlots.status,
          })
          .from(scheduleSlots)
          .where(eq(scheduleSlots.id, slotId))
          .limit(1);
        return rows[0] ?? null;
      }, "DB_QUERY_FAILED");
    },

    async updateSlotStatus(slotId, status) {
      return R.fromAsync(async () => {
        await db
          .update(scheduleSlots)
          .set({ status, updatedAt: sql`now()` })
          .where(eq(scheduleSlots.id, slotId));
      }, "DB_QUERY_FAILED");
    },

    async findSlotByOperatorDateAndTime(operatorId, date, startTime) {
      return R.fromAsync(async () => {
        const rows = await db
          .select({
            id: scheduleSlots.id,
            status: scheduleSlots.status,
          })
          .from(scheduleSlots)
          .where(
            and(
              eq(scheduleSlots.operatorId, operatorId),
              eq(scheduleSlots.date, date),
              eq(scheduleSlots.startTime, startTime),
            ),
          )
          .limit(1);
        return rows[0] ?? null;
      }, "DB_QUERY_FAILED");
    },

    async findOperatorById(operatorId) {
      return R.fromAsync(async () => {
        const rows = await db
          .select({
            id: operators.id,
            userId: operators.userId,
            businessId: operators.businessId,
            tenantId: operators.tenantId,
          })
          .from(operators)
          .where(eq(operators.id, operatorId))
          .limit(1);
        return rows[0] ?? null;
      }, "DB_QUERY_FAILED");
    },

    async findOperatorByUserId(userId) {
      return R.fromAsync(async () => {
        const rows = await db
          .select({
            id: operators.id,
            userId: operators.userId,
            businessId: operators.businessId,
            tenantId: operators.tenantId,
          })
          .from(operators)
          .where(eq(operators.userId, userId))
          .limit(1);
        return rows[0] ?? null;
      }, "DB_QUERY_FAILED");
    },

    async findServiceById(serviceId) {
      return R.fromAsync(async () => {
        const rows = await db
          .select({
            id: services.id,
            businessId: services.businessId,
            durationMinutes: services.durationMinutes,
            priceCents: services.priceCents,
            active: services.active,
          })
          .from(services)
          .where(eq(services.id, serviceId))
          .limit(1);
        return rows[0] ?? null;
      }, "DB_QUERY_FAILED");
    },

    async findOperatorService(operatorId, serviceId) {
      return R.fromAsync(async () => {
        const rows = await db
          .select({
            id: operatorServices.id,
            priceCents: operatorServices.priceCents,
            durationMinutes: operatorServices.durationMinutes,
            active: operatorServices.active,
          })
          .from(operatorServices)
          .where(
            and(
              eq(operatorServices.operatorId, operatorId),
              eq(operatorServices.serviceId, serviceId),
            ),
          )
          .limit(1);
        return rows[0] ?? null;
      }, "DB_QUERY_FAILED");
    },

    async findBusinessById(businessId) {
      return R.fromAsync(async () => {
        const rows = await db
          .select({
            id: businesses.id,
            tenantId: businesses.tenantId,
          })
          .from(businesses)
          .where(eq(businesses.id, businessId))
          .limit(1);
        return rows[0] ?? null;
      }, "DB_QUERY_FAILED");
    },
  };
}
