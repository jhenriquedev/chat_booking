import type { Result } from "../../core/result/result.js";
import { Result as R } from "../../core/result/result.js";
import type { IServiceRepository } from "./5_repository.js";
import type {
  CreateServiceRequest,
  ListServicesQuery,
  PaginatedServicesResponse,
  ServiceProfile,
  UpdateServiceRequest,
} from "./types/dtos/dtos.js";
import type { ServiceRow } from "./types/models/models.js";

export interface IServiceService {
  create(
    input: CreateServiceRequest,
    callerRole: string,
    callerTenantId: string | null,
  ): Promise<Result<ServiceProfile>>;
  getById(
    id: string,
    callerRole: string,
    callerTenantId: string | null,
    callerBusinessId: string | null,
  ): Promise<Result<ServiceProfile>>;
  listAll(
    query: ListServicesQuery,
    callerRole: string,
    callerTenantId: string | null,
    callerBusinessId: string | null,
  ): Promise<Result<PaginatedServicesResponse>>;
  update(
    id: string,
    input: UpdateServiceRequest,
    callerRole: string,
    callerTenantId: string | null,
  ): Promise<Result<ServiceProfile>>;
  delete(
    id: string,
    callerRole: string,
    callerTenantId: string | null,
  ): Promise<Result<{ message: string }>>;
}

function toProfile(row: ServiceRow): ServiceProfile {
  return {
    id: row.id,
    businessId: row.businessId,
    name: row.name,
    description: row.description,
    durationMinutes: row.durationMinutes,
    priceCents: row.priceCents,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function createServiceService(repository: IServiceRepository): IServiceService {
  /** Verifica se a business existe e se o caller tem permissão */
  async function checkBusinessOwnership(
    businessId: string,
    callerRole: string,
    callerTenantId: string | null,
  ): Promise<Result<{ id: string; tenantId: string }>> {
    const businessResult = await repository.findBusinessById(businessId);
    if (businessResult.isErr()) return R.fail(businessResult.error);
    if (!businessResult.value) {
      return R.fail({ code: "NOT_FOUND", message: "Business não encontrada" });
    }

    if (callerRole === "TENANT" && callerTenantId !== businessResult.value.tenantId) {
      return R.fail({ code: "FORBIDDEN", message: "Permissão insuficiente" });
    }

    return R.ok(businessResult.value);
  }

  return {
    async create(input, callerRole, callerTenantId) {
      const ownershipCheck = await checkBusinessOwnership(
        input.businessId,
        callerRole,
        callerTenantId,
      );
      if (ownershipCheck.isErr()) return R.fail(ownershipCheck.error);

      const createResult = await repository.create({
        businessId: input.businessId,
        name: input.name,
        description: input.description ?? null,
        durationMinutes: input.durationMinutes,
        priceCents: input.priceCents,
      });
      if (createResult.isErr()) return R.fail(createResult.error);

      return R.ok(toProfile(createResult.value));
    },

    async getById(id, callerRole, callerTenantId, callerBusinessId) {
      const result = await repository.findById(id);
      if (result.isErr()) return R.fail(result.error);
      if (!result.value) return R.fail({ code: "NOT_FOUND", message: "Serviço não encontrado" });

      // OPERATOR só vê serviços da própria business
      if (callerRole === "OPERATOR" && callerBusinessId !== result.value.businessId) {
        return R.fail({ code: "FORBIDDEN", message: "Permissão insuficiente" });
      }

      // TENANT só vê serviços de businesses do próprio tenant
      if (callerRole === "TENANT") {
        const ownershipCheck = await checkBusinessOwnership(
          result.value.businessId,
          callerRole,
          callerTenantId,
        );
        if (ownershipCheck.isErr()) return R.fail(ownershipCheck.error);
      }

      return R.ok(toProfile(result.value));
    },

    async listAll(query, callerRole, callerTenantId, callerBusinessId) {
      // OPERATOR só vê serviços da própria business
      if (callerRole === "OPERATOR" && callerBusinessId !== query.businessId) {
        return R.fail({ code: "FORBIDDEN", message: "Permissão insuficiente" });
      }

      // TENANT: verifica ownership da business
      if (callerRole === "TENANT") {
        const ownershipCheck = await checkBusinessOwnership(
          query.businessId,
          callerRole,
          callerTenantId,
        );
        if (ownershipCheck.isErr()) return R.fail(ownershipCheck.error);
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
        return R.fail({ code: "NOT_FOUND", message: "Serviço não encontrado" });

      // Verifica ownership da business do serviço
      const ownershipCheck = await checkBusinessOwnership(
        findResult.value.businessId,
        callerRole,
        callerTenantId,
      );
      if (ownershipCheck.isErr()) return R.fail(ownershipCheck.error);

      const updateResult = await repository.update(id, input);
      if (updateResult.isErr()) return R.fail(updateResult.error);

      return R.ok(toProfile(updateResult.value));
    },

    async delete(id, callerRole, callerTenantId) {
      const findResult = await repository.findById(id);
      if (findResult.isErr()) return R.fail(findResult.error);
      if (!findResult.value)
        return R.fail({ code: "NOT_FOUND", message: "Serviço não encontrado" });

      // Verifica ownership da business do serviço
      const ownershipCheck = await checkBusinessOwnership(
        findResult.value.businessId,
        callerRole,
        callerTenantId,
      );
      if (ownershipCheck.isErr()) return R.fail(ownershipCheck.error);

      if (!findResult.value.active) {
        return R.fail({ code: "ALREADY_INACTIVE", message: "Serviço já está inativo" });
      }

      const deleteResult = await repository.softDelete(id);
      if (deleteResult.isErr()) return R.fail(deleteResult.error);

      return R.ok({ message: "Serviço desativado com sucesso" });
    },
  };
}
