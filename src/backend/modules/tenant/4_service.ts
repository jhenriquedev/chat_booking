import { hashPhone } from "../../core/crypto/crypto.js";
import type { Result } from "../../core/result/result.js";
import { Result as R } from "../../core/result/result.js";
import type { Role } from "../../core/session/session.guard.js";
import type { ITenantRepository } from "./5_repository.js";
import type {
  CreateTenantRequest,
  ListTenantsQuery,
  PaginatedTenantsResponse,
  TenantProfile,
  UpdateTenantRequest,
} from "./types/dtos/dtos.js";
import type { TenantWithUserRow } from "./types/models/models.js";

export interface ITenantService {
  create(input: CreateTenantRequest): Promise<Result<TenantProfile>>;
  getById(
    id: string,
    callerRole: Role,
    callerTenantId: string | null,
  ): Promise<Result<TenantProfile>>;
  listAll(query: ListTenantsQuery): Promise<Result<PaginatedTenantsResponse>>;
  update(id: string, input: UpdateTenantRequest): Promise<Result<TenantProfile>>;
  delete(id: string): Promise<Result<{ message: string }>>;
}

function toProfile(row: TenantWithUserRow): TenantProfile {
  return {
    id: row.id,
    userId: row.userId,
    userName: row.userName,
    userPhone: row.userPhone,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function createTenantService(repository: ITenantRepository): ITenantService {
  return {
    async create(input) {
      const phoneHash = hashPhone(input.phone);

      // 1. Busca user pelo phoneHash
      const userResult = await repository.findUserByPhoneHash(phoneHash);
      if (userResult.isErr()) return R.fail(userResult.error);

      let existingUserId: string | undefined;

      if (userResult.value) {
        // 2. User existe — verifica role e se já é tenant
        existingUserId = userResult.value.id;

        if (userResult.value.role === "OWNER") {
          return R.fail({
            code: "FORBIDDEN",
            message: "Não é possível rebaixar um OWNER para TENANT",
          });
        }

        const existingTenant = await repository.findByUserId(existingUserId);
        if (existingTenant.isErr()) return R.fail(existingTenant.error);
        if (existingTenant.value) {
          return R.fail({
            code: "ALREADY_EXISTS",
            message: "Este telefone já está vinculado a um tenant",
          });
        }
      }

      // 3. Cria tenant + user/role em transação atômica
      const createResult = await repository.createTenantWithUser({
        existingUserId,
        name: input.name ?? input.phone,
        phone: input.phone,
        phoneHash,
      });
      if (createResult.isErr()) return R.fail(createResult.error);

      // 4. Busca tenant com dados do user para response
      const tenantResult = await repository.findById(createResult.value.id);
      if (tenantResult.isErr()) return R.fail(tenantResult.error);
      if (!tenantResult.value)
        return R.fail({ code: "NOT_FOUND", message: "Tenant não encontrado" });

      return R.ok(toProfile(tenantResult.value));
    },

    async getById(id, callerRole, callerTenantId) {
      const result = await repository.findById(id);
      if (result.isErr()) return R.fail(result.error);
      if (!result.value) return R.fail({ code: "NOT_FOUND", message: "Tenant não encontrado" });

      // TENANT só pode ver o próprio registro
      if (callerRole === "TENANT" && callerTenantId !== id) {
        return R.fail({ code: "FORBIDDEN", message: "Permissão insuficiente" });
      }

      return R.ok(toProfile(result.value));
    },

    async listAll(query) {
      const result = await repository.findAll({
        page: query.page,
        limit: query.limit,
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

    async update(id, input) {
      const findResult = await repository.findById(id);
      if (findResult.isErr()) return R.fail(findResult.error);
      if (!findResult.value) return R.fail({ code: "NOT_FOUND", message: "Tenant não encontrado" });

      const updateResult = await repository.update(id, input);
      if (updateResult.isErr()) return R.fail(updateResult.error);

      // Busca com JOIN atualizado
      const tenantResult = await repository.findById(id);
      if (tenantResult.isErr()) return R.fail(tenantResult.error);
      if (!tenantResult.value)
        return R.fail({ code: "NOT_FOUND", message: "Tenant não encontrado" });

      return R.ok(toProfile(tenantResult.value));
    },

    async delete(id) {
      const findResult = await repository.findById(id);
      if (findResult.isErr()) return R.fail(findResult.error);
      if (!findResult.value) return R.fail({ code: "NOT_FOUND", message: "Tenant não encontrado" });
      if (!findResult.value.active) {
        return R.fail({ code: "ALREADY_INACTIVE", message: "Tenant já está inativo" });
      }

      const deleteResult = await repository.softDelete(id);
      if (deleteResult.isErr()) return R.fail(deleteResult.error);

      return R.ok({ message: "Tenant desativado com sucesso" });
    },
  };
}
