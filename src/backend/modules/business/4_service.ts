import type { Result } from "../../core/result/result.js";
import { Result as R } from "../../core/result/result.js";
import type { IBusinessRepository } from "./5_repository.js";
import type {
  BusinessProfile,
  CreateBusinessRequest,
  ListBusinessesQuery,
  PaginatedBusinessesResponse,
  UpdateBusinessRequest,
} from "./types/dtos/dtos.js";
import type { BusinessRow } from "./types/models/models.js";

export interface IBusinessService {
  create(
    input: CreateBusinessRequest,
    callerRole: string,
    callerTenantId: string | null,
  ): Promise<Result<BusinessProfile>>;
  getById(
    id: string,
    callerRole: string,
    callerTenantId: string | null,
    callerBusinessId: string | null,
  ): Promise<Result<BusinessProfile>>;
  getBySlug(slug: string): Promise<Result<BusinessProfile>>;
  listAll(
    query: ListBusinessesQuery,
    callerRole: string,
    callerTenantId: string | null,
  ): Promise<Result<PaginatedBusinessesResponse>>;
  update(
    id: string,
    input: UpdateBusinessRequest,
    callerRole: string,
    callerTenantId: string | null,
  ): Promise<Result<BusinessProfile>>;
  delete(
    id: string,
    callerRole: string,
    callerTenantId: string | null,
  ): Promise<Result<{ message: string }>>;
}

function toProfile(row: BusinessRow): BusinessProfile {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    slug: row.slug,
    phone: row.phone,
    email: row.email,
    cnpj: row.cnpj,
    website: row.website,
    address: row.address,
    description: row.description,
    logoUrl: row.logoUrl,
    coverUrl: row.coverUrl,
    businessHours: row.businessHours,
    socialLinks: row.socialLinks,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function createBusinessService(repository: IBusinessRepository): IBusinessService {
  return {
    async create(input, callerRole, callerTenantId) {
      // Determina o tenantId: OWNER pode informar, TENANT usa o próprio
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

      // Verifica slug único
      const slugResult = await repository.findBySlug(input.slug);
      if (slugResult.isErr()) return R.fail(slugResult.error);
      if (slugResult.value) {
        return R.fail({ code: "ALREADY_EXISTS", message: "Já existe um business com este slug" });
      }

      const createResult = await repository.create({
        tenantId,
        name: input.name,
        slug: input.slug,
        phone: input.phone ?? null,
        email: input.email ?? null,
        cnpj: input.cnpj ?? null,
        website: input.website ?? null,
        address: input.address ?? null,
        description: input.description ?? null,
        logoUrl: input.logoUrl ?? null,
        coverUrl: input.coverUrl ?? null,
        businessHours: input.businessHours ?? null,
        socialLinks: input.socialLinks ?? null,
      });
      if (createResult.isErr()) return R.fail(createResult.error);

      return R.ok(toProfile(createResult.value));
    },

    async getById(id, callerRole, callerTenantId, callerBusinessId) {
      const result = await repository.findById(id);
      if (result.isErr()) return R.fail(result.error);
      if (!result.value) return R.fail({ code: "NOT_FOUND", message: "Business não encontrado" });

      // TENANT só vê businesses do próprio tenant
      if (callerRole === "TENANT" && callerTenantId !== result.value.tenantId) {
        return R.fail({ code: "FORBIDDEN", message: "Permissão insuficiente" });
      }

      // OPERATOR só vê a business onde trabalha
      if (callerRole === "OPERATOR" && callerBusinessId !== id) {
        return R.fail({ code: "FORBIDDEN", message: "Permissão insuficiente" });
      }

      return R.ok(toProfile(result.value));
    },

    async getBySlug(slug) {
      const result = await repository.findBySlug(slug);
      if (result.isErr()) return R.fail(result.error);
      if (!result.value) return R.fail({ code: "NOT_FOUND", message: "Business não encontrado" });

      // Só retorna se estiver ativo (público)
      if (!result.value.active) {
        return R.fail({ code: "NOT_FOUND", message: "Business não encontrado" });
      }

      return R.ok(toProfile(result.value));
    },

    async listAll(query, callerRole, callerTenantId) {
      // TENANT só vê suas businesses; OWNER pode filtrar por tenantId
      let tenantId: string | undefined;
      if (callerRole === "TENANT") {
        if (!callerTenantId) {
          return R.fail({ code: "FORBIDDEN", message: "Usuário não está vinculado a um tenant" });
        }
        tenantId = callerTenantId;
      } else {
        tenantId = query.tenantId;
      }

      const result = await repository.findAll({
        page: query.page,
        limit: query.limit,
        active: query.active,
        tenantId,
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
        return R.fail({ code: "NOT_FOUND", message: "Business não encontrado" });

      // TENANT só edita businesses do próprio tenant
      if (callerRole === "TENANT" && callerTenantId !== findResult.value.tenantId) {
        return R.fail({ code: "FORBIDDEN", message: "Permissão insuficiente" });
      }

      // Se está alterando o slug, verifica unicidade
      if (input.slug && input.slug !== findResult.value.slug) {
        const slugResult = await repository.findBySlug(input.slug);
        if (slugResult.isErr()) return R.fail(slugResult.error);
        if (slugResult.value) {
          return R.fail({
            code: "ALREADY_EXISTS",
            message: "Já existe um business com este slug",
          });
        }
      }

      const updateResult = await repository.update(id, input);
      if (updateResult.isErr()) return R.fail(updateResult.error);

      return R.ok(toProfile(updateResult.value));
    },

    async delete(id, callerRole, callerTenantId) {
      const findResult = await repository.findById(id);
      if (findResult.isErr()) return R.fail(findResult.error);
      if (!findResult.value)
        return R.fail({ code: "NOT_FOUND", message: "Business não encontrado" });

      // TENANT só deleta businesses do próprio tenant
      if (callerRole === "TENANT" && callerTenantId !== findResult.value.tenantId) {
        return R.fail({ code: "FORBIDDEN", message: "Permissão insuficiente" });
      }

      if (!findResult.value.active) {
        return R.fail({ code: "ALREADY_INACTIVE", message: "Business já está inativo" });
      }

      const deleteResult = await repository.softDelete(id);
      if (deleteResult.isErr()) return R.fail(deleteResult.error);

      return R.ok({ message: "Business desativado com sucesso" });
    },
  };
}
