import { and, count, desc, eq, inArray } from "drizzle-orm";
import type { Container } from "../../core/container/container.js";
import type { Result } from "../../core/result/result.js";
import { Result as R } from "../../core/result/result.js";
import { appointments, businesses, notifications, operators } from "../../shared/schemas/index.js";
import type { NotificationRow } from "./types/models/models.js";

export interface INotificationRepository {
  create(
    data: Omit<NotificationRow, "id" | "status" | "sentAt" | "createdAt">,
  ): Promise<Result<NotificationRow>>;

  findById(id: string): Promise<Result<NotificationRow | null>>;

  findAll(params: {
    page: number;
    limit: number;
    type?: string;
    channel?: string;
    status?: string;
    appointmentId?: string;
    userId?: string;
    operatorId?: string;
    tenantId?: string;
  }): Promise<Result<{ data: NotificationRow[]; total: number }>>;

  updateStatus(
    id: string,
    status: NotificationRow["status"],
    sentAt?: Date,
  ): Promise<Result<NotificationRow>>;

  findAppointmentById(appointmentId: string): Promise<
    Result<{
      id: string;
      userId: string;
      operatorId: string;
      businessId: string;
    } | null>
  >;

  findOperatorByUserId(userId: string): Promise<Result<{ id: string } | null>>;

  findBusinessById(businessId: string): Promise<Result<{ id: string; tenantId: string } | null>>;
}

export function createNotificationRepository(container: Container): INotificationRepository {
  const { db } = container;

  return {
    async create(data) {
      return R.fromAsync(async () => {
        const rows = await db
          .insert(notifications)
          .values({
            userId: data.userId,
            appointmentId: data.appointmentId,
            type: data.type,
            channel: data.channel,
            content: data.content,
          })
          .returning();
        if (!rows[0]) throw new Error("Insert não retornou registro");
        return rows[0];
      }, "DB_QUERY_FAILED");
    },

    async findById(id) {
      return R.fromAsync(async () => {
        const rows = await db.select().from(notifications).where(eq(notifications.id, id)).limit(1);
        return rows[0] ?? null;
      }, "DB_QUERY_FAILED");
    },

    async findAll(params) {
      return R.fromAsync(async () => {
        const conditions: ReturnType<typeof eq>[] = [];

        if (params.userId) {
          conditions.push(eq(notifications.userId, params.userId));
        }
        if (params.type) {
          conditions.push(eq(notifications.type, params.type as NotificationRow["type"]));
        }
        if (params.channel) {
          conditions.push(eq(notifications.channel, params.channel as NotificationRow["channel"]));
        }
        if (params.status) {
          conditions.push(eq(notifications.status, params.status as NotificationRow["status"]));
        }
        if (params.appointmentId) {
          conditions.push(eq(notifications.appointmentId, params.appointmentId));
        }
        if (params.operatorId) {
          conditions.push(
            inArray(
              notifications.appointmentId,
              db
                .select({ id: appointments.id })
                .from(appointments)
                .where(eq(appointments.operatorId, params.operatorId)),
            ),
          );
        }
        if (params.tenantId) {
          conditions.push(
            inArray(
              notifications.appointmentId,
              db
                .select({ id: appointments.id })
                .from(appointments)
                .innerJoin(businesses, eq(appointments.businessId, businesses.id))
                .where(eq(businesses.tenantId, params.tenantId)),
            ),
          );
        }

        const where = conditions.length > 0 ? and(...conditions) : undefined;
        const offset = (params.page - 1) * params.limit;

        const [data, countResult] = await Promise.all([
          db
            .select()
            .from(notifications)
            .where(where)
            .orderBy(desc(notifications.createdAt))
            .limit(params.limit)
            .offset(offset),
          db.select({ total: count() }).from(notifications).where(where),
        ]);

        return { data, total: countResult[0].total };
      }, "DB_QUERY_FAILED");
    },

    async updateStatus(id, status, sentAt) {
      return R.fromAsync(async () => {
        const rows = await db
          .update(notifications)
          .set({
            status,
            ...(sentAt ? { sentAt } : {}),
          })
          .where(eq(notifications.id, id))
          .returning();
        if (!rows[0]) throw new Error("Update não retornou registro");
        return rows[0];
      }, "DB_QUERY_FAILED");
    },

    async findAppointmentById(appointmentId) {
      return R.fromAsync(async () => {
        const rows = await db
          .select({
            id: appointments.id,
            userId: appointments.userId,
            operatorId: appointments.operatorId,
            businessId: appointments.businessId,
          })
          .from(appointments)
          .where(eq(appointments.id, appointmentId))
          .limit(1);
        return rows[0] ?? null;
      }, "DB_QUERY_FAILED");
    },

    async findOperatorByUserId(userId) {
      return R.fromAsync(async () => {
        const rows = await db
          .select({ id: operators.id })
          .from(operators)
          .where(eq(operators.userId, userId))
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
