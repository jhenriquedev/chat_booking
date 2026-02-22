import { createRoute, z } from "@hono/zod-openapi";
import {
  createTenantRequestSchema,
  errorResponseSchema,
  listTenantsQuerySchema,
  messageResponseSchema,
  paginatedTenantsResponseSchema,
  tenantProfileSchema,
  updateTenantRequestSchema,
} from "./types/dtos/dtos.js";

// ========== CREATE ==========

export const createTenantRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Tenants"],
  summary: "Criar tenant",
  description:
    "Cria um novo tenant a partir do telefone. Se o usuário não existir, cria automaticamente. Promove o role para TENANT.",
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: { "application/json": { schema: createTenantRequestSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: tenantProfileSchema } },
      description: "Tenant criado com sucesso",
    },
    401: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Token ausente ou inválido",
    },
    403: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Permissão insuficiente",
    },
    409: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Usuário já é tenant",
    },
    422: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Erro de validação",
    },
  },
});

// ========== LIST ==========

export const listTenantsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Tenants"],
  summary: "Listar tenants",
  description: "Lista todos os tenants com paginação. Restrito a OWNER.",
  security: [{ Bearer: [] }],
  request: {
    query: listTenantsQuerySchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: paginatedTenantsResponseSchema } },
      description: "Lista paginada de tenants",
    },
    401: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Token ausente ou inválido",
    },
    403: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Permissão insuficiente",
    },
  },
});

// ========== GET BY ID ==========

export const getTenantByIdRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Tenants"],
  summary: "Buscar tenant por ID",
  description: "Retorna um tenant pelo ID. TENANT só vê o próprio registro; OWNER vê todos.",
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: tenantProfileSchema } },
      description: "Tenant encontrado",
    },
    401: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Token ausente ou inválido",
    },
    403: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Permissão insuficiente",
    },
    404: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Tenant não encontrado",
    },
  },
});

// ========== UPDATE ==========

export const updateTenantRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["Tenants"],
  summary: "Atualizar tenant",
  description: "Atualiza dados de um tenant. Restrito a OWNER.",
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: { "application/json": { schema: updateTenantRequestSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: tenantProfileSchema } },
      description: "Tenant atualizado",
    },
    401: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Token ausente ou inválido",
    },
    403: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Permissão insuficiente",
    },
    404: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Tenant não encontrado",
    },
    422: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Erro de validação",
    },
  },
});

// ========== DELETE ==========

export const deleteTenantRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Tenants"],
  summary: "Desativar tenant",
  description: "Desativa um tenant (soft delete). Restrito a OWNER.",
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: messageResponseSchema } },
      description: "Tenant desativado",
    },
    401: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Token ausente ou inválido",
    },
    403: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Permissão insuficiente",
    },
    404: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Tenant não encontrado",
    },
  },
});
