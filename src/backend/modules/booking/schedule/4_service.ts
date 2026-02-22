import type { Result } from "../../../core/result/result.js";
import { Result as R } from "../../../core/result/result.js";
import type { IScheduleRepository } from "./5_repository.js";
import type {
  GenerateSlotsRequest,
  GenerateSlotsResponse,
  ListSlotsQuery,
  ScheduleSlotProfile,
  UpdateSlotStatusRequest,
} from "./types/dtos/dtos.js";
import type { ScheduleSlotRow } from "./types/models/models.js";

export interface IScheduleService {
  generate(
    input: GenerateSlotsRequest,
    callerRole: string,
    callerTenantId: string | null,
  ): Promise<Result<GenerateSlotsResponse>>;
  listByDate(
    query: ListSlotsQuery,
    callerRole: string,
    callerTenantId: string | null,
    callerUserId: string,
  ): Promise<Result<ScheduleSlotProfile[]>>;
  updateStatus(
    id: string,
    input: UpdateSlotStatusRequest,
    callerRole: string,
    callerTenantId: string | null,
    callerUserId: string,
  ): Promise<Result<ScheduleSlotProfile>>;
  deleteSlot(
    id: string,
    callerRole: string,
    callerTenantId: string | null,
  ): Promise<Result<{ message: string }>>;
}

function toProfile(row: ScheduleSlotRow): ScheduleSlotProfile {
  return {
    id: row.id,
    operatorId: row.operatorId,
    date: row.date,
    startTime: row.startTime,
    endTime: row.endTime,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Soma minutos a um horário HH:MM e retorna HH:MM */
function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  if (total >= 1440) return "24:00";
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Retorna o dayOfWeek (0=dom, 6=sab) de uma data YYYY-MM-DD em UTC */
function getDayOfWeek(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** Retorna array de datas YYYY-MM-DD entre dateFrom e dateTo (inclusive) em UTC */
function getDateRange(dateFrom: string, dateTo: string): string[] {
  const dates: string[] = [];
  const [sy, sm, sd] = dateFrom.split("-").map(Number);
  const start = new Date(Date.UTC(sy, sm - 1, sd));
  const [ey, em, ed] = dateTo.split("-").map(Number);
  const end = new Date(Date.UTC(ey, em - 1, ed));

  const cursor = new Date(start);
  while (cursor <= end) {
    const y = cursor.getUTCFullYear();
    const mo = String(cursor.getUTCMonth() + 1).padStart(2, "0");
    const d = String(cursor.getUTCDate()).padStart(2, "0");
    dates.push(`${y}-${mo}-${d}`);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

export function createScheduleService(repository: IScheduleRepository): IScheduleService {
  /**
   * Verifica acesso do caller ao operador:
   * - OWNER: acesso total
   * - TENANT: operador deve pertencer ao mesmo tenant
   * - OPERATOR: deve ser o próprio operador (userId === callerUserId)
   */
  async function checkOperatorAccess(
    operatorId: string,
    callerRole: string,
    callerTenantId: string | null,
    callerUserId?: string,
  ): Promise<Result<{ id: string; userId: string; tenantId: string }>> {
    const operatorResult = await repository.findOperatorById(operatorId);
    if (operatorResult.isErr()) return R.fail(operatorResult.error);
    if (!operatorResult.value) {
      return R.fail({ code: "NOT_FOUND", message: "Operador não encontrado" });
    }

    const operator = operatorResult.value;

    if (callerRole === "OPERATOR" && callerUserId && operator.userId !== callerUserId) {
      return R.fail({ code: "FORBIDDEN", message: "Permissão insuficiente" });
    }

    if (callerRole === "TENANT" && callerTenantId !== operator.tenantId) {
      return R.fail({ code: "FORBIDDEN", message: "Permissão insuficiente" });
    }

    return R.ok(operator);
  }

  return {
    async generate(input, callerRole, callerTenantId) {
      // Verifica acesso ao operador (sem callerUserId — generate é TENANT/OWNER only)
      const accessCheck = await checkOperatorAccess(input.operatorId, callerRole, callerTenantId);
      if (accessCheck.isErr()) return R.fail(accessCheck.error);

      // Valida range máximo de 31 dias
      const dates = getDateRange(input.dateFrom, input.dateTo);
      if (dates.length > 31) {
        return R.fail({
          code: "VALIDATION_ERROR",
          message: "Range máximo é de 31 dias",
        });
      }

      // Busca availability rules ativas do operador
      const rulesResult = await repository.findActiveAvailabilityRules(input.operatorId);
      if (rulesResult.isErr()) return R.fail(rulesResult.error);

      if (rulesResult.value.length === 0) {
        return R.fail({
          code: "NOT_FOUND",
          message: "Operador não possui regras de disponibilidade ativas",
        });
      }

      // Agrupa regras por dayOfWeek
      const rulesByDay = new Map<number, { startTime: string; endTime: string }[]>();
      for (const rule of rulesResult.value) {
        const existing = rulesByDay.get(rule.dayOfWeek) ?? [];
        existing.push({ startTime: rule.startTime, endTime: rule.endTime });
        rulesByDay.set(rule.dayOfWeek, existing);
      }

      let totalGenerated = 0;

      // Para cada data no range
      for (const date of dates) {
        const dayOfWeek = getDayOfWeek(date);
        const dayRules = rulesByDay.get(dayOfWeek);
        if (!dayRules) continue;

        // Busca slots já existentes para evitar duplicados
        const existingResult = await repository.findExistingSlots(input.operatorId, date);
        if (existingResult.isErr()) return R.fail(existingResult.error);

        const existingSet = new Set(existingResult.value.map((s) => `${s.startTime}-${s.endTime}`));

        // Gera slots para cada regra
        const newSlots: { operatorId: string; date: string; startTime: string; endTime: string }[] =
          [];

        for (const rule of dayRules) {
          let cursor = rule.startTime;
          while (true) {
            const slotEnd = addMinutes(cursor, input.durationMinutes);
            if (slotEnd > rule.endTime) break;

            const key = `${cursor}-${slotEnd}`;
            if (!existingSet.has(key)) {
              newSlots.push({
                operatorId: input.operatorId,
                date,
                startTime: cursor,
                endTime: slotEnd,
              });
              existingSet.add(key);
            }

            cursor = slotEnd;
          }
        }

        // Bulk insert dos novos slots
        if (newSlots.length > 0) {
          const insertResult = await repository.createMany(newSlots);
          if (insertResult.isErr()) return R.fail(insertResult.error);
          totalGenerated += insertResult.value;
        }
      }

      return R.ok({
        generated: totalGenerated,
        message: `${totalGenerated} slots gerados com sucesso`,
      });
    },

    async listByDate(query, callerRole, callerTenantId, callerUserId) {
      // Verifica acesso ao operador
      const accessCheck = await checkOperatorAccess(
        query.operatorId,
        callerRole,
        callerTenantId,
        callerUserId,
      );
      if (accessCheck.isErr()) return R.fail(accessCheck.error);

      const result = await repository.findByOperatorAndDate(
        query.operatorId,
        query.date,
        query.status,
      );
      if (result.isErr()) return R.fail(result.error);

      return R.ok(result.value.map(toProfile));
    },

    async updateStatus(id, input, callerRole, callerTenantId, callerUserId) {
      // Busca o slot
      const findResult = await repository.findById(id);
      if (findResult.isErr()) return R.fail(findResult.error);
      if (!findResult.value) {
        return R.fail({ code: "NOT_FOUND", message: "Slot não encontrado" });
      }

      const slot = findResult.value;

      // Verifica acesso ao operador do slot
      const accessCheck = await checkOperatorAccess(
        slot.operatorId,
        callerRole,
        callerTenantId,
        callerUserId,
      );
      if (accessCheck.isErr()) return R.fail(accessCheck.error);

      // Não permite alterar slots BOOKED
      if (slot.status === "BOOKED") {
        return R.fail({
          code: "CONFLICT",
          message: "Não é possível alterar um slot com agendamento",
        });
      }

      // Não permite alterar para o mesmo status
      if (slot.status === input.status) {
        return R.fail({
          code: "VALIDATION_ERROR",
          message: `Slot já está com status ${input.status}`,
        });
      }

      const updateResult = await repository.updateStatus(id, input.status);
      if (updateResult.isErr()) return R.fail(updateResult.error);

      return R.ok(toProfile(updateResult.value));
    },

    async deleteSlot(id, callerRole, callerTenantId) {
      // Busca o slot
      const findResult = await repository.findById(id);
      if (findResult.isErr()) return R.fail(findResult.error);
      if (!findResult.value) {
        return R.fail({ code: "NOT_FOUND", message: "Slot não encontrado" });
      }

      const slot = findResult.value;

      // Verifica acesso ao operador do slot (sem callerUserId — delete é TENANT/OWNER only)
      const accessCheck = await checkOperatorAccess(slot.operatorId, callerRole, callerTenantId);
      if (accessCheck.isErr()) return R.fail(accessCheck.error);

      // Não permite remover slots BOOKED
      if (slot.status === "BOOKED") {
        return R.fail({
          code: "CONFLICT",
          message: "Não é possível remover um slot com agendamento",
        });
      }

      const deleteResult = await repository.deleteSlot(id);
      if (deleteResult.isErr()) return R.fail(deleteResult.error);

      return R.ok({ message: "Slot removido com sucesso" });
    },
  };
}
