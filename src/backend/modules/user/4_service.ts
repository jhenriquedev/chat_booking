import { hashPhone } from "../../core/crypto/crypto.js";
import type { Result } from "../../core/result/result.js";
import { Result as R } from "../../core/result/result.js";
import type { Role } from "../../core/session/session.guard.js";
import type { IUserRepository } from "./5_repository.js";
import type {
  CreateOwnerRequest,
  ListUsersQuery,
  PaginatedUsersResponse,
  UpdateMyProfileRequest,
  UpdateOwnerRequest,
  UpdateUserRequest,
  UserProfile,
} from "./types/dtos/dtos.js";
import type { UserRow } from "./types/models/models.js";

export interface IUserService {
  getMyProfile(userId: string): Promise<Result<UserProfile>>;
  updateMyProfile(userId: string, input: UpdateMyProfileRequest): Promise<Result<UserProfile>>;
  listUsers(
    query: ListUsersQuery,
    callerRole: Role,
    callerTenantId: string | null,
  ): Promise<Result<PaginatedUsersResponse>>;
  getUserById(
    id: string,
    callerRole: Role,
    callerTenantId: string | null,
  ): Promise<Result<UserProfile>>;
  updateUser(
    id: string,
    input: UpdateUserRequest,
    callerUserId: string,
  ): Promise<Result<UserProfile>>;
  deleteUser(id: string, callerUserId: string): Promise<Result<{ message: string }>>;
  createOwner(input: CreateOwnerRequest): Promise<Result<UserProfile>>;
  updateOwner(id: string, input: UpdateOwnerRequest): Promise<Result<UserProfile>>;
}

function toProfile(row: UserRow): UserProfile {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    role: row.role,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function createUserService(repository: IUserRepository): IUserService {
  return {
    async getMyProfile(userId) {
      const result = await repository.findById(userId);
      if (result.isErr()) return R.fail(result.error);
      if (!result.value) return R.fail({ code: "NOT_FOUND", message: "Usuário não encontrado" });

      return R.ok(toProfile(result.value));
    },

    async updateMyProfile(userId, input) {
      const findResult = await repository.findById(userId);
      if (findResult.isErr()) return R.fail(findResult.error);
      if (!findResult.value)
        return R.fail({ code: "NOT_FOUND", message: "Usuário não encontrado" });

      const updateResult = await repository.update(userId, input);
      if (updateResult.isErr()) return R.fail(updateResult.error);

      return R.ok(toProfile(updateResult.value));
    },

    async listUsers(query, callerRole, callerTenantId) {
      let tenantFilter: string | undefined;
      if (callerRole === "TENANT") {
        if (!callerTenantId) {
          return R.fail({
            code: "FORBIDDEN",
            message: "Usuário não está vinculado a um tenant",
          });
        }
        tenantFilter = callerTenantId;
      }

      const result = await repository.findAll({
        page: query.page,
        limit: query.limit,
        role: query.role,
        active: query.active,
        search: query.search,
        tenantId: tenantFilter,
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

    async getUserById(id, callerRole, callerTenantId) {
      if (callerRole === "TENANT") {
        if (!callerTenantId) {
          return R.fail({
            code: "FORBIDDEN",
            message: "Usuário não está vinculado a um tenant",
          });
        }

        const belongs = await repository.userBelongsToTenant(id, callerTenantId);
        if (belongs.isErr()) return R.fail(belongs.error);
        if (!belongs.value) return R.fail({ code: "NOT_FOUND", message: "Usuário não encontrado" });
      }

      const result = await repository.findById(id);
      if (result.isErr()) return R.fail(result.error);
      if (!result.value) return R.fail({ code: "NOT_FOUND", message: "Usuário não encontrado" });

      return R.ok(toProfile(result.value));
    },

    async updateUser(id, input, callerUserId) {
      if (id === callerUserId && input.role) {
        return R.fail({ code: "FORBIDDEN", message: "Não é possível alterar o próprio role" });
      }

      const findResult = await repository.findById(id);
      if (findResult.isErr()) return R.fail(findResult.error);
      if (!findResult.value)
        return R.fail({ code: "NOT_FOUND", message: "Usuário não encontrado" });

      const updateResult = await repository.update(id, input);
      if (updateResult.isErr()) return R.fail(updateResult.error);

      return R.ok(toProfile(updateResult.value));
    },

    async deleteUser(id, callerUserId) {
      if (id === callerUserId) {
        return R.fail({ code: "FORBIDDEN", message: "Não é possível desativar a si mesmo" });
      }

      const findResult = await repository.findById(id);
      if (findResult.isErr()) return R.fail(findResult.error);
      if (!findResult.value)
        return R.fail({ code: "NOT_FOUND", message: "Usuário não encontrado" });
      if (!findResult.value.active)
        return R.fail({ code: "ALREADY_INACTIVE", message: "Usuário já está inativo" });

      const deleteResult = await repository.softDelete(id);
      if (deleteResult.isErr()) return R.fail(deleteResult.error);

      return R.ok({ message: "Usuário desativado com sucesso" });
    },

    async createOwner(input) {
      const phoneHash = hashPhone(input.phone);

      const existingResult = await repository.findByPhoneHash(phoneHash);
      if (existingResult.isErr()) return R.fail(existingResult.error);
      if (existingResult.value) {
        return R.fail({
          code: "ALREADY_EXISTS",
          message: "Já existe um usuário com este telefone",
        });
      }

      const createResult = await repository.create({
        name: input.name ?? input.phone,
        phone: input.phone,
        phoneHash,
        role: "OWNER",
      });
      if (createResult.isErr()) return R.fail(createResult.error);

      return R.ok(toProfile(createResult.value));
    },

    async updateOwner(id, input) {
      const findResult = await repository.findById(id);
      if (findResult.isErr()) return R.fail(findResult.error);
      if (!findResult.value) return R.fail({ code: "NOT_FOUND", message: "Owner não encontrado" });
      if (findResult.value.role !== "OWNER")
        return R.fail({ code: "NOT_FOUND", message: "Owner não encontrado" });

      const updateResult = await repository.update(id, input);
      if (updateResult.isErr()) return R.fail(updateResult.error);

      return R.ok(toProfile(updateResult.value));
    },
  };
}
