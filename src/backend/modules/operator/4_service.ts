import type { Result } from "../../core/result/result.js";
import { Result as R } from "../../core/result/result.js";
import type { IOperatorRepository } from "./5_repository.js";
import type {
  CreateOperatorRequest,
  LinkServiceRequest,
  ListOperatorsQuery,
  OperatorProfile,
  OperatorServiceProfile,
  PaginatedOperatorsResponse,
  UpdateOperatorRequest,
} from "./types/dtos/dtos.js";
import type { OperatorRow, OperatorServiceRow } from "./types/models/models.js";

export interface IOperatorService {
  create(
    input: CreateOperatorRequest,
    callerRole: string,
    callerTenantId: string | null,
  ): Promise<Result<OperatorProfile>>;
  getById(
    id: string,
    callerRole: string,
    callerTenantId: string | null,
    callerUserId: string,
  ): Promise<Result<OperatorProfile>>;
  listAll(
    query: ListOperatorsQuery,
    callerRole: string,
    callerTenantId: string | null,
  ): Promise<Result<PaginatedOperatorsResponse>>;
  update(
    id: string,
    input: UpdateOperatorRequest,
    callerRole: string,
    callerTenantId: string | null,
  ): Promise<Result<OperatorProfile>>;
  delete(
    id: string,
    callerRole: string,
    callerTenantId: string | null,
  ): Promise<Result<{ message: string }>>;
  linkService(
    operatorId: string,
    input: LinkServiceRequest,
    callerRole: string,
    callerTenantId: string | null,
  ): Promise<Result<OperatorServiceProfile>>;
  unlinkService(
    operatorId: string,
    serviceId: string,
    callerRole: string,
    callerTenantId: string | null,
  ): Promise<Result<{ message: string }>>;
}

function toProfile(row: OperatorRow): OperatorProfile {
  return {
    id: row.id,
    userId: row.userId,
    businessId: row.businessId,
    tenantId: row.tenantId,
    displayName: row.displayName,
    canEditService: row.canEditService,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toServiceProfile(row: OperatorServiceRow): OperatorServiceProfile {
  return {
    id: row.id,
    operatorId: row.operatorId,
    serviceId: row.serviceId,
    priceCents: row.priceCents,
    durationMinutes: row.durationMinutes,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
  };
}

export function createOperatorService(repository: IOperatorRepository): IOperatorService {
  /** Verifica se o operator pertence ao tenant do caller */
  function checkTenantOwnership(
    operator: OperatorRow,
    callerRole: string,
    callerTenantId: string | null,
  ): Result<void> {
    if (callerRole === "TENANT" && callerTenantId !== operator.tenantId) {
      return R.fail({ code: "FORBIDDEN", message: "Permissão insuficiente" });
    }
    return R.ok(undefined);
  }

  return {
    async create(input, callerRole, callerTenantId) {
      // Determina o tenantId
      let tenantId: string;
      if (callerRole === "OWNER") {
        if (!input.tenantId) {
          return R.fail({ code: "VALIDATION_ERROR", message: "tenantId é obrigatório para OWNER" });
        }
        tenantId = input.tenantId;
      } else {
        if (!callerTenantId) {
          return R.fail({ code: "FORBIDDEN", message: "Usuário não está vinculado a um tenant" });
        }
        tenantId = callerTenantId;
      }

      // Verifica que o user existe
      const userResult = await repository.findUserById(input.userId);
      if (userResult.isErr()) return R.fail(userResult.error);
      if (!userResult.value) {
        return R.fail({ code: "NOT_FOUND", message: "Usuário não encontrado" });
      }

      // Verifica que o user não é já um operator
      const existingOp = await repository.findByUserId(input.userId);
      if (existingOp.isErr()) return R.fail(existingOp.error);
      if (existingOp.value) {
        return R.fail({ code: "ALREADY_EXISTS", message: "Este usuário já é um operador" });
      }

      // Verifica que a business existe e pertence ao tenant
      const businessResult = await repository.findBusinessById(input.businessId);
      if (businessResult.isErr()) return R.fail(businessResult.error);
      if (!businessResult.value) {
        return R.fail({ code: "NOT_FOUND", message: "Business não encontrada" });
      }
      if (businessResult.value.tenantId !== tenantId) {
        return R.fail({
          code: "FORBIDDEN",
          message: "Business não pertence ao tenant informado",
        });
      }

      // Cria o operador e promove role em transação atômica
      const createResult = await repository.createWithRolePromotion({
        userId: input.userId,
        businessId: input.businessId,
        tenantId,
        displayName: input.displayName,
        canEditService: input.canEditService ?? false,
      });
      if (createResult.isErr()) return R.fail(createResult.error);

      return R.ok(toProfile(createResult.value));
    },

    async getById(id, callerRole, callerTenantId, callerUserId) {
      const result = await repository.findById(id);
      if (result.isErr()) return R.fail(result.error);
      if (!result.value) return R.fail({ code: "NOT_FOUND", message: "Operador não encontrado" });

      // OPERATOR só vê a si mesmo
      if (callerRole === "OPERATOR" && callerUserId !== result.value.userId) {
        return R.fail({ code: "FORBIDDEN", message: "Permissão insuficiente" });
      }

      // TENANT só vê operadores do próprio tenant
      const ownershipCheck = checkTenantOwnership(result.value, callerRole, callerTenantId);
      if (ownershipCheck.isErr()) return R.fail(ownershipCheck.error);

      return R.ok(toProfile(result.value));
    },

    async listAll(query, callerRole, callerTenantId) {
      // TENANT: verifica que a business pertence ao tenant
      if (callerRole === "TENANT") {
        const businessResult = await repository.findBusinessById(query.businessId);
        if (businessResult.isErr()) return R.fail(businessResult.error);
        if (!businessResult.value) {
          return R.fail({ code: "NOT_FOUND", message: "Business não encontrada" });
        }
        if (callerTenantId !== businessResult.value.tenantId) {
          return R.fail({ code: "FORBIDDEN", message: "Permissão insuficiente" });
        }
      }

      const result = await repository.findAll({
        page: query.page,
        limit: query.limit,
        businessId: query.businessId,
        active: query.active,
      });
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

    async update(id, input, callerRole, callerTenantId) {
      const findResult = await repository.findById(id);
      if (findResult.isErr()) return R.fail(findResult.error);
      if (!findResult.value)
        return R.fail({ code: "NOT_FOUND", message: "Operador não encontrado" });

      const ownershipCheck = checkTenantOwnership(findResult.value, callerRole, callerTenantId);
      if (ownershipCheck.isErr()) return R.fail(ownershipCheck.error);

      const updateResult = await repository.update(id, input);
      if (updateResult.isErr()) return R.fail(updateResult.error);

      return R.ok(toProfile(updateResult.value));
    },

    async delete(id, callerRole, callerTenantId) {
      const findResult = await repository.findById(id);
      if (findResult.isErr()) return R.fail(findResult.error);
      if (!findResult.value)
        return R.fail({ code: "NOT_FOUND", message: "Operador não encontrado" });

      const ownershipCheck = checkTenantOwnership(findResult.value, callerRole, callerTenantId);
      if (ownershipCheck.isErr()) return R.fail(ownershipCheck.error);

      if (!findResult.value.active) {
        return R.fail({ code: "ALREADY_INACTIVE", message: "Operador já está inativo" });
      }

      // Determina o role anterior: se o user possui um tenant, reverte para TENANT; senão, USER
      const tenantResult = await repository.findTenantByUserId(findResult.value.userId);
      if (tenantResult.isErr()) return R.fail(tenantResult.error);
      const previousRole = tenantResult.value ? "TENANT" : "USER";

      // Desativa operador e reverte role em transação atômica
      const deleteResult = await repository.softDeleteWithRoleRevert(
        id,
        findResult.value.userId,
        previousRole,
      );
      if (deleteResult.isErr()) return R.fail(deleteResult.error);

      return R.ok({ message: "Operador desativado com sucesso" });
    },

    async linkService(operatorId, input, callerRole, callerTenantId) {
      // Verifica que o operador existe
      const operatorResult = await repository.findById(operatorId);
      if (operatorResult.isErr()) return R.fail(operatorResult.error);
      if (!operatorResult.value)
        return R.fail({ code: "NOT_FOUND", message: "Operador não encontrado" });

      const ownershipCheck = checkTenantOwnership(operatorResult.value, callerRole, callerTenantId);
      if (ownershipCheck.isErr()) return R.fail(ownershipCheck.error);

      // Verifica que o serviço existe e pertence à mesma business
      const serviceResult = await repository.findServiceById(input.serviceId);
      if (serviceResult.isErr()) return R.fail(serviceResult.error);
      if (!serviceResult.value) {
        return R.fail({ code: "NOT_FOUND", message: "Serviço não encontrado" });
      }
      if (serviceResult.value.businessId !== operatorResult.value.businessId) {
        return R.fail({
          code: "VALIDATION_ERROR",
          message: "Serviço não pertence à mesma business do operador",
        });
      }

      // Verifica duplicidade de vínculo ativo
      const existingLink = await repository.findOperatorService(operatorId, input.serviceId);
      if (existingLink.isErr()) return R.fail(existingLink.error);
      if (existingLink.value) {
        return R.fail({
          code: "ALREADY_EXISTS",
          message: "Este serviço já está vinculado ao operador",
        });
      }

      const createResult = await repository.createOperatorService({
        operatorId,
        serviceId: input.serviceId,
        priceCents: input.priceCents ?? null,
        durationMinutes: input.durationMinutes ?? null,
      });
      if (createResult.isErr()) return R.fail(createResult.error);

      return R.ok(toServiceProfile(createResult.value));
    },

    async unlinkService(operatorId, serviceId, callerRole, callerTenantId) {
      // Verifica que o operador existe
      const operatorResult = await repository.findById(operatorId);
      if (operatorResult.isErr()) return R.fail(operatorResult.error);
      if (!operatorResult.value)
        return R.fail({ code: "NOT_FOUND", message: "Operador não encontrado" });

      const ownershipCheck = checkTenantOwnership(operatorResult.value, callerRole, callerTenantId);
      if (ownershipCheck.isErr()) return R.fail(ownershipCheck.error);

      // Verifica que o vínculo existe
      const existingLink = await repository.findOperatorService(operatorId, serviceId);
      if (existingLink.isErr()) return R.fail(existingLink.error);
      if (!existingLink.value) {
        return R.fail({ code: "NOT_FOUND", message: "Vínculo não encontrado" });
      }

      const deleteResult = await repository.softDeleteOperatorService(operatorId, serviceId);
      if (deleteResult.isErr()) return R.fail(deleteResult.error);

      return R.ok({ message: "Serviço desvinculado com sucesso" });
    },
  };
}
