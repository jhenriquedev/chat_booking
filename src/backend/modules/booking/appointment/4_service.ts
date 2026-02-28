import { localToUtc } from "../../../core/date/date.utils.js";
import type { Result } from "../../../core/result/result.js";
import { Result as R } from "../../../core/result/result.js";
import type { Role } from "../../../core/session/session.guard.js";
import type { IAppointmentRepository } from "./5_repository.js";
import type {
  AppointmentProfile,
  CancelAppointmentRequest,
  CreateAppointmentRequest,
  ListAppointmentsQuery,
  PaginatedAppointmentsResponse,
} from "./types/dtos/dtos.js";
import type { AppointmentRow } from "./types/models/models.js";

export interface IAppointmentService {
  create(
    input: CreateAppointmentRequest,
    callerUserId: string,
  ): Promise<Result<AppointmentProfile>>;
  list(
    query: ListAppointmentsQuery,
    callerRole: Role,
    callerUserId: string,
    callerTenantId: string | null,
  ): Promise<Result<PaginatedAppointmentsResponse>>;
  getById(
    id: string,
    callerRole: Role,
    callerUserId: string,
    callerTenantId: string | null,
  ): Promise<Result<AppointmentProfile>>;
  confirm(
    id: string,
    callerRole: Role,
    callerUserId: string,
    callerTenantId: string | null,
  ): Promise<Result<AppointmentProfile>>;
  cancel(
    id: string,
    input: CancelAppointmentRequest,
    callerRole: Role,
    callerUserId: string,
    callerTenantId: string | null,
  ): Promise<Result<AppointmentProfile>>;
  complete(
    id: string,
    callerRole: Role,
    callerUserId: string,
    callerTenantId: string | null,
  ): Promise<Result<AppointmentProfile>>;
  noShow(
    id: string,
    callerRole: Role,
    callerUserId: string,
    callerTenantId: string | null,
  ): Promise<Result<AppointmentProfile>>;
}

function toProfile(row: AppointmentRow): AppointmentProfile {
  return {
    id: row.id,
    userId: row.userId,
    operatorId: row.operatorId,
    businessId: row.businessId,
    serviceId: row.serviceId,
    slotId: row.slotId,
    scheduledAt: row.scheduledAt.toISOString(),
    durationMinutes: row.durationMinutes,
    priceCents: row.priceCents,
    status: row.status,
    notes: row.notes,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function createAppointmentService(repository: IAppointmentRepository): IAppointmentService {
  /**
   * Verifica se o caller tem acesso a um appointment:
   * - OWNER: acesso total
   * - USER: appointment.userId === callerUserId
   * - OPERATOR: appointment.operatorId corresponde ao operator do callerUserId
   * - TENANT: business do appointment pertence ao tenant do caller
   */
  async function checkAppointmentAccess(
    appointment: AppointmentRow,
    callerRole: Role,
    callerUserId: string,
    callerTenantId: string | null,
  ): Promise<Result<void>> {
    if (callerRole === "OWNER") return R.ok(undefined);

    if (callerRole === "USER") {
      if (appointment.userId !== callerUserId) {
        return R.fail({ code: "FORBIDDEN", message: "Permissão insuficiente" });
      }
      return R.ok(undefined);
    }

    if (callerRole === "OPERATOR") {
      const operatorResult = await repository.findOperatorByUserId(callerUserId);
      if (operatorResult.isErr()) return R.fail(operatorResult.error);
      if (!operatorResult.value || operatorResult.value.id !== appointment.operatorId) {
        return R.fail({ code: "FORBIDDEN", message: "Permissão insuficiente" });
      }
      return R.ok(undefined);
    }

    if (callerRole === "TENANT") {
      const businessResult = await repository.findBusinessById(appointment.businessId);
      if (businessResult.isErr()) return R.fail(businessResult.error);
      if (!businessResult.value || businessResult.value.tenantId !== callerTenantId) {
        return R.fail({ code: "FORBIDDEN", message: "Permissão insuficiente" });
      }
      return R.ok(undefined);
    }

    return R.fail({ code: "FORBIDDEN", message: "Permissão insuficiente" });
  }

  return {
    async create(input, callerUserId) {
      // Busca o slot
      const slotResult = await repository.findSlotById(input.slotId);
      if (slotResult.isErr()) return R.fail(slotResult.error);
      if (!slotResult.value) {
        return R.fail({ code: "NOT_FOUND", message: "Slot não encontrado" });
      }

      const slot = slotResult.value;

      // Verifica que o slot está disponível
      if (slot.status !== "AVAILABLE") {
        return R.fail({ code: "CONFLICT", message: "Slot não está disponível" });
      }

      // Busca o operador do slot
      const operatorResult = await repository.findOperatorById(slot.operatorId);
      if (operatorResult.isErr()) return R.fail(operatorResult.error);
      if (!operatorResult.value) {
        return R.fail({ code: "NOT_FOUND", message: "Operador não encontrado" });
      }

      const operator = operatorResult.value;

      // Busca o business para obter o timezone
      const businessResult = await repository.findBusinessById(operator.businessId);
      if (businessResult.isErr()) return R.fail(businessResult.error);
      if (!businessResult.value) {
        return R.fail({ code: "NOT_FOUND", message: "Business não encontrado" });
      }

      const business = businessResult.value;

      // Impede operador de se auto-agendar
      if (operator.userId === callerUserId) {
        return R.fail({
          code: "VALIDATION_ERROR",
          message: "Operador não pode agendar a si mesmo",
        });
      }

      // Busca o serviço
      const serviceResult = await repository.findServiceById(input.serviceId);
      if (serviceResult.isErr()) return R.fail(serviceResult.error);
      if (!serviceResult.value) {
        return R.fail({ code: "NOT_FOUND", message: "Serviço não encontrado" });
      }

      const service = serviceResult.value;

      if (!service.active) {
        return R.fail({ code: "VALIDATION_ERROR", message: "Serviço está inativo" });
      }

      // Verifica que o serviço pertence ao mesmo business do operador
      if (service.businessId !== operator.businessId) {
        return R.fail({
          code: "VALIDATION_ERROR",
          message: "Serviço não pertence ao mesmo business do operador",
        });
      }

      // Verifica vínculo operator_services ativo
      const opServiceResult = await repository.findOperatorService(
        slot.operatorId,
        input.serviceId,
      );
      if (opServiceResult.isErr()) return R.fail(opServiceResult.error);
      if (!opServiceResult.value || !opServiceResult.value.active) {
        return R.fail({ code: "VALIDATION_ERROR", message: "Operador não oferece este serviço" });
      }

      const opService = opServiceResult.value;

      // Resolve duração e preço (override do operator_services ?? default do service)
      const durationMinutes = opService.durationMinutes ?? service.durationMinutes;
      const priceCents = opService.priceCents ?? service.priceCents;

      // Computa scheduledAt convertendo horário local do business para UTC
      const scheduledAt = localToUtc(slot.date, slot.startTime, business.timezone);

      // Cria o appointment e marca slot como BOOKED em transação atômica
      const createResult = await repository.createWithSlotBooking(
        {
          userId: callerUserId,
          operatorId: slot.operatorId,
          businessId: operator.businessId,
          serviceId: input.serviceId,
          slotId: input.slotId,
          scheduledAt,
          durationMinutes,
          priceCents,
          notes: input.notes ?? null,
        },
        input.slotId,
      );
      if (createResult.isErr()) return R.fail(createResult.error);

      return R.ok(toProfile(createResult.value));
    },

    async list(query, callerRole, callerUserId, callerTenantId) {
      const params: Parameters<typeof repository.findAll>[0] = {
        page: query.page,
        limit: query.limit,
        status: query.status,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        operatorId: query.operatorId,
        businessId: query.businessId,
      };

      // Filtragem por role
      if (callerRole === "USER") {
        params.userId = callerUserId;
      } else if (callerRole === "OPERATOR") {
        const operatorResult = await repository.findOperatorByUserId(callerUserId);
        if (operatorResult.isErr()) return R.fail(operatorResult.error);
        if (!operatorResult.value) {
          return R.ok({
            data: [],
            pagination: { page: query.page, limit: query.limit, total: 0, totalPages: 0 },
          });
        }
        params.operatorId = operatorResult.value.id;
      } else if (callerRole === "TENANT") {
        if (!callerTenantId) {
          return R.fail({
            code: "FORBIDDEN",
            message: "Usuário não está vinculado a um tenant",
          });
        }
        params.tenantId = callerTenantId;
      }
      // OWNER: sem filtro adicional

      const result = await repository.findAll(params);
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
      const findResult = await repository.findById(id);
      if (findResult.isErr()) return R.fail(findResult.error);
      if (!findResult.value) {
        return R.fail({ code: "NOT_FOUND", message: "Agendamento não encontrado" });
      }

      const accessCheck = await checkAppointmentAccess(
        findResult.value,
        callerRole,
        callerUserId,
        callerTenantId,
      );
      if (accessCheck.isErr()) return R.fail(accessCheck.error);

      return R.ok(toProfile(findResult.value));
    },

    async confirm(id, callerRole, callerUserId, callerTenantId) {
      if (callerRole === "USER") {
        return R.fail({ code: "FORBIDDEN", message: "Permissão insuficiente" });
      }

      const findResult = await repository.findById(id);
      if (findResult.isErr()) return R.fail(findResult.error);
      if (!findResult.value) {
        return R.fail({ code: "NOT_FOUND", message: "Agendamento não encontrado" });
      }

      const appointment = findResult.value;

      if (appointment.status !== "PENDING") {
        return R.fail({
          code: "CONFLICT",
          message: "Apenas agendamentos PENDING podem ser confirmados",
        });
      }

      const accessCheck = await checkAppointmentAccess(
        appointment,
        callerRole,
        callerUserId,
        callerTenantId,
      );
      if (accessCheck.isErr()) return R.fail(accessCheck.error);

      const updateResult = await repository.updateStatus(id, "CONFIRMED");
      if (updateResult.isErr()) return R.fail(updateResult.error);

      return R.ok(toProfile(updateResult.value));
    },

    async cancel(id, input, callerRole, callerUserId, callerTenantId) {
      const findResult = await repository.findById(id);
      if (findResult.isErr()) return R.fail(findResult.error);
      if (!findResult.value) {
        return R.fail({ code: "NOT_FOUND", message: "Agendamento não encontrado" });
      }

      const appointment = findResult.value;

      if (appointment.status !== "PENDING" && appointment.status !== "CONFIRMED") {
        return R.fail({
          code: "CONFLICT",
          message: "Apenas agendamentos PENDING ou CONFIRMED podem ser cancelados",
        });
      }

      const accessCheck = await checkAppointmentAccess(
        appointment,
        callerRole,
        callerUserId,
        callerTenantId,
      );
      if (accessCheck.isErr()) return R.fail(accessCheck.error);

      // Appenda razão do cancelamento em notes se fornecida
      const updatedNotes = input.reason
        ? appointment.notes
          ? `${appointment.notes}\n[Cancelamento] ${input.reason}`
          : `[Cancelamento] ${input.reason}`
        : appointment.notes;

      // Cancela appointment e libera slot em transação atômica
      const cancelResult = await repository.cancelWithSlotRelease(
        id,
        { cancelledAt: new Date(), notes: updatedNotes },
        appointment.slotId,
      );
      if (cancelResult.isErr()) return R.fail(cancelResult.error);

      return R.ok(toProfile(cancelResult.value));
    },

    async complete(id, callerRole, callerUserId, callerTenantId) {
      if (callerRole === "USER") {
        return R.fail({ code: "FORBIDDEN", message: "Permissão insuficiente" });
      }

      const findResult = await repository.findById(id);
      if (findResult.isErr()) return R.fail(findResult.error);
      if (!findResult.value) {
        return R.fail({ code: "NOT_FOUND", message: "Agendamento não encontrado" });
      }

      const appointment = findResult.value;

      if (appointment.status !== "CONFIRMED") {
        return R.fail({
          code: "CONFLICT",
          message: "Apenas agendamentos CONFIRMED podem ser concluídos",
        });
      }

      const accessCheck = await checkAppointmentAccess(
        appointment,
        callerRole,
        callerUserId,
        callerTenantId,
      );
      if (accessCheck.isErr()) return R.fail(accessCheck.error);

      const updateResult = await repository.updateStatus(id, "COMPLETED", {
        completedAt: new Date(),
      });
      if (updateResult.isErr()) return R.fail(updateResult.error);

      return R.ok(toProfile(updateResult.value));
    },

    async noShow(id, callerRole, callerUserId, callerTenantId) {
      if (callerRole === "USER") {
        return R.fail({ code: "FORBIDDEN", message: "Permissão insuficiente" });
      }

      const findResult = await repository.findById(id);
      if (findResult.isErr()) return R.fail(findResult.error);
      if (!findResult.value) {
        return R.fail({ code: "NOT_FOUND", message: "Agendamento não encontrado" });
      }

      const appointment = findResult.value;

      if (appointment.status !== "CONFIRMED") {
        return R.fail({
          code: "CONFLICT",
          message: "Apenas agendamentos CONFIRMED podem ser marcados como no-show",
        });
      }

      const accessCheck = await checkAppointmentAccess(
        appointment,
        callerRole,
        callerUserId,
        callerTenantId,
      );
      if (accessCheck.isErr()) return R.fail(accessCheck.error);

      const updateResult = await repository.updateStatus(id, "NO_SHOW");
      if (updateResult.isErr()) return R.fail(updateResult.error);

      return R.ok(toProfile(updateResult.value));
    },
  };
}
