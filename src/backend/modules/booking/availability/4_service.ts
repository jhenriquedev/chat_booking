import type { Result } from "../../../core/result/result.js";
import { Result as R } from "../../../core/result/result.js";
import type { IAvailabilityRepository } from "./5_repository.js";
import type {
  AvailabilityRuleProfile,
  CreateAvailabilityRuleRequest,
  ListAvailabilityRulesQuery,
  UpdateAvailabilityRuleRequest,
} from "./types/dtos/dtos.js";
import type { AvailabilityRuleRow } from "./types/models/models.js";

export interface IAvailabilityService {
  create(
    input: CreateAvailabilityRuleRequest,
    callerRole: string,
    callerTenantId: string | null,
    callerUserId: string,
  ): Promise<Result<AvailabilityRuleProfile>>;
  listByOperator(
    query: ListAvailabilityRulesQuery,
    callerRole: string,
    callerTenantId: string | null,
    callerUserId: string,
  ): Promise<Result<AvailabilityRuleProfile[]>>;
  update(
    id: string,
    input: UpdateAvailabilityRuleRequest,
    callerRole: string,
    callerTenantId: string | null,
    callerUserId: string,
  ): Promise<Result<AvailabilityRuleProfile>>;
  delete(
    id: string,
    callerRole: string,
    callerTenantId: string | null,
    callerUserId: string,
  ): Promise<Result<{ message: string }>>;
}

function toProfile(row: AvailabilityRuleRow): AvailabilityRuleProfile {
  return {
    id: row.id,
    operatorId: row.operatorId,
    dayOfWeek: row.dayOfWeek,
    startTime: row.startTime,
    endTime: row.endTime,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function createAvailabilityService(
  repository: IAvailabilityRepository,
): IAvailabilityService {
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
    callerUserId: string,
  ): Promise<Result<{ id: string; userId: string; tenantId: string }>> {
    const operatorResult = await repository.findOperatorById(operatorId);
    if (operatorResult.isErr()) return R.fail(operatorResult.error);
    if (!operatorResult.value) {
      return R.fail({ code: "NOT_FOUND", message: "Operador não encontrado" });
    }

    const operator = operatorResult.value;

    if (callerRole === "OPERATOR" && operator.userId !== callerUserId) {
      return R.fail({ code: "FORBIDDEN", message: "Permissão insuficiente" });
    }

    if (callerRole === "TENANT" && callerTenantId !== operator.tenantId) {
      return R.fail({ code: "FORBIDDEN", message: "Permissão insuficiente" });
    }

    return R.ok(operator);
  }

  return {
    async create(input, callerRole, callerTenantId, callerUserId) {
      // Verifica acesso ao operador
      const accessCheck = await checkOperatorAccess(
        input.operatorId,
        callerRole,
        callerTenantId,
        callerUserId,
      );
      if (accessCheck.isErr()) return R.fail(accessCheck.error);

      // Verifica overlap
      const overlapResult = await repository.findOverlapping(
        input.operatorId,
        input.dayOfWeek,
        input.startTime,
        input.endTime,
      );
      if (overlapResult.isErr()) return R.fail(overlapResult.error);
      if (overlapResult.value) {
        return R.fail({
          code: "CONFLICT",
          message: "Já existe uma regra ativa com horários sobrepostos neste dia",
        });
      }

      const createResult = await repository.create({
        operatorId: input.operatorId,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
      });
      if (createResult.isErr()) return R.fail(createResult.error);

      return R.ok(toProfile(createResult.value));
    },

    async listByOperator(query, callerRole, callerTenantId, callerUserId) {
      // Verifica acesso ao operador
      const accessCheck = await checkOperatorAccess(
        query.operatorId,
        callerRole,
        callerTenantId,
        callerUserId,
      );
      if (accessCheck.isErr()) return R.fail(accessCheck.error);

      const result = await repository.findByOperator(query.operatorId, query.active);
      if (result.isErr()) return R.fail(result.error);

      return R.ok(result.value.map(toProfile));
    },

    async update(id, input, callerRole, callerTenantId, callerUserId) {
      // Busca a regra
      const findResult = await repository.findById(id);
      if (findResult.isErr()) return R.fail(findResult.error);
      if (!findResult.value) {
        return R.fail({ code: "NOT_FOUND", message: "Regra de disponibilidade não encontrada" });
      }

      const rule = findResult.value;

      // Verifica acesso ao operador da regra
      const accessCheck = await checkOperatorAccess(
        rule.operatorId,
        callerRole,
        callerTenantId,
        callerUserId,
      );
      if (accessCheck.isErr()) return R.fail(accessCheck.error);

      // Determina valores finais para verificação de overlap
      const finalDayOfWeek = input.dayOfWeek ?? rule.dayOfWeek;
      const finalStartTime = input.startTime ?? rule.startTime;
      const finalEndTime = input.endTime ?? rule.endTime;

      // Valida startTime < endTime quando um dos dois muda sem o outro
      if (finalStartTime >= finalEndTime) {
        return R.fail({
          code: "VALIDATION_ERROR",
          message: "Hora de início deve ser anterior à hora de fim",
        });
      }

      // Verifica overlap (excluindo a própria regra)
      const overlapResult = await repository.findOverlapping(
        rule.operatorId,
        finalDayOfWeek,
        finalStartTime,
        finalEndTime,
        id,
      );
      if (overlapResult.isErr()) return R.fail(overlapResult.error);
      if (overlapResult.value) {
        return R.fail({
          code: "CONFLICT",
          message: "Já existe uma regra ativa com horários sobrepostos neste dia",
        });
      }

      const updateResult = await repository.update(id, input);
      if (updateResult.isErr()) return R.fail(updateResult.error);

      return R.ok(toProfile(updateResult.value));
    },

    async delete(id, callerRole, callerTenantId, callerUserId) {
      // Busca a regra
      const findResult = await repository.findById(id);
      if (findResult.isErr()) return R.fail(findResult.error);
      if (!findResult.value) {
        return R.fail({ code: "NOT_FOUND", message: "Regra de disponibilidade não encontrada" });
      }

      const rule = findResult.value;

      // Verifica acesso ao operador da regra
      const accessCheck = await checkOperatorAccess(
        rule.operatorId,
        callerRole,
        callerTenantId,
        callerUserId,
      );
      if (accessCheck.isErr()) return R.fail(accessCheck.error);

      if (!rule.active) {
        return R.fail({ code: "ALREADY_INACTIVE", message: "Regra já está inativa" });
      }

      const deleteResult = await repository.softDelete(id);
      if (deleteResult.isErr()) return R.fail(deleteResult.error);

      return R.ok({ message: "Regra de disponibilidade desativada com sucesso" });
    },
  };
}
