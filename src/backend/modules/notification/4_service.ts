import type { Result } from "../../core/result/result.js";
import { Result as R } from "../../core/result/result.js";
import type { Role } from "../../core/session/session.guard.js";
import type { INotificationRepository } from "./5_repository.js";
import type {
  NotificationProfile,
  PaginatedNotificationsResponse,
  SendNotificationRequest,
} from "./types/dtos/dtos.js";
import type { NotificationRow } from "./types/models/models.js";

export interface INotificationService {
  list(
    query: {
      page: number;
      limit: number;
      type?: string;
      channel?: string;
      status?: string;
      appointmentId?: string;
    },
    callerRole: Role,
    callerUserId: string,
    callerTenantId: string | null,
  ): Promise<Result<PaginatedNotificationsResponse>>;

  getById(
    id: string,
    callerRole: Role,
    callerUserId: string,
    callerTenantId: string | null,
  ): Promise<Result<NotificationProfile>>;

  send(
    input: SendNotificationRequest,
    callerRole: Role,
    callerTenantId: string | null,
  ): Promise<Result<NotificationProfile>>;
}

function toProfile(row: NotificationRow): NotificationProfile {
  return {
    id: row.id,
    userId: row.userId,
    appointmentId: row.appointmentId,
    type: row.type,
    channel: row.channel,
    status: row.status,
    content: row.content,
    sentAt: row.sentAt ? row.sentAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function createNotificationService(repo: INotificationRepository): INotificationService {
  async function checkNotificationAccess(
    notification: NotificationRow,
    callerRole: Role,
    callerUserId: string,
    callerTenantId: string | null,
  ): Promise<Result<void>> {
    if (callerRole === "OWNER") return R.ok(undefined);

    if (callerRole === "USER") {
      if (notification.userId !== callerUserId) {
        return R.fail({ code: "FORBIDDEN", message: "Sem acesso a esta notificação" });
      }
      return R.ok(undefined);
    }

    const apptResult = await repo.findAppointmentById(notification.appointmentId);
    if (apptResult.isErr()) return R.fail(apptResult.error);
    if (!apptResult.value) {
      return R.fail({ code: "NOT_FOUND", message: "Appointment não encontrado" });
    }
    const appt = apptResult.value;

    if (callerRole === "OPERATOR") {
      const opResult = await repo.findOperatorByUserId(callerUserId);
      if (opResult.isErr()) return R.fail(opResult.error);
      if (!opResult.value || opResult.value.id !== appt.operatorId) {
        return R.fail({ code: "FORBIDDEN", message: "Sem acesso a esta notificação" });
      }
      return R.ok(undefined);
    }

    if (callerRole === "TENANT") {
      if (!callerTenantId) {
        return R.fail({ code: "FORBIDDEN", message: "Sem acesso a esta notificação" });
      }
      const bizResult = await repo.findBusinessById(appt.businessId);
      if (bizResult.isErr()) return R.fail(bizResult.error);
      if (!bizResult.value || bizResult.value.tenantId !== callerTenantId) {
        return R.fail({ code: "FORBIDDEN", message: "Sem acesso a esta notificação" });
      }
      return R.ok(undefined);
    }

    return R.fail({ code: "FORBIDDEN", message: "Sem acesso a esta notificação" });
  }

  return {
    async list(query, callerRole, callerUserId, callerTenantId) {
      const params: Parameters<typeof repo.findAll>[0] = {
        page: query.page,
        limit: query.limit,
        type: query.type,
        channel: query.channel,
        status: query.status,
        appointmentId: query.appointmentId,
      };

      if (callerRole === "USER") {
        params.userId = callerUserId;
      } else if (callerRole === "OPERATOR") {
        const opResult = await repo.findOperatorByUserId(callerUserId);
        if (opResult.isErr()) return R.fail(opResult.error);
        if (!opResult.value) {
          return R.ok({
            data: [],
            pagination: { page: query.page, limit: query.limit, total: 0, totalPages: 0 },
          });
        }
        params.operatorId = opResult.value.id;
      } else if (callerRole === "TENANT") {
        if (!callerTenantId) {
          return R.ok({
            data: [],
            pagination: { page: query.page, limit: query.limit, total: 0, totalPages: 0 },
          });
        }
        params.tenantId = callerTenantId;
      }
      // OWNER: sem filtro extra

      const result = await repo.findAll(params);
      if (result.isErr()) return R.fail(result.error);

      const { data, total } = result.value;
      return R.ok({
        data: data.map(toProfile),
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      });
    },

    async getById(id, callerRole, callerUserId, callerTenantId) {
      const result = await repo.findById(id);
      if (result.isErr()) return R.fail(result.error);
      if (!result.value) {
        return R.fail({ code: "NOT_FOUND", message: "Notificação não encontrada" });
      }

      const accessResult = await checkNotificationAccess(
        result.value,
        callerRole,
        callerUserId,
        callerTenantId,
      );
      if (accessResult.isErr()) return R.fail(accessResult.error);

      return R.ok(toProfile(result.value));
    },

    async send(input, callerRole, callerTenantId) {
      const apptResult = await repo.findAppointmentById(input.appointmentId);
      if (apptResult.isErr()) return R.fail(apptResult.error);
      if (!apptResult.value) {
        return R.fail({ code: "NOT_FOUND", message: "Appointment não encontrado" });
      }
      const appt = apptResult.value;

      if (callerRole === "TENANT") {
        if (!callerTenantId) {
          return R.fail({
            code: "FORBIDDEN",
            message: "Sem acesso a este appointment",
          });
        }
        const bizResult = await repo.findBusinessById(appt.businessId);
        if (bizResult.isErr()) return R.fail(bizResult.error);
        if (!bizResult.value || bizResult.value.tenantId !== callerTenantId) {
          return R.fail({
            code: "FORBIDDEN",
            message: "Appointment não pertence ao seu tenant",
          });
        }
      }

      const createResult = await repo.create({
        userId: appt.userId,
        appointmentId: input.appointmentId,
        type: input.type,
        channel: input.channel,
        content: input.content,
      });
      if (createResult.isErr()) return R.fail(createResult.error);

      return R.ok(toProfile(createResult.value));
    },
  };
}
