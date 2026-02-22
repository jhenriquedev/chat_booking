import { createRoute, z } from "@hono/zod-openapi";
import {
  createOwnerRequestSchema,
  errorResponseSchema,
  listUsersQuerySchema,
  messageResponseSchema,
  paginatedUsersResponseSchema,
  updateMyProfileRequestSchema,
  updateOwnerRequestSchema,
  updateUserRequestSchema,
  userProfileSchema,
} from "./types/dtos/dtos.js";

// ========== /me ==========

export const getMyProfileRoute = createRoute({
  method: "get",
  path: "/me",
  tags: ["Users"],
  summary: "Meu perfil",
  description: "Retorna o perfil do usuário autenticado.",
  security: [{ Bearer: [] }],
  responses: {
    200: {
      content: { "application/json": { schema: userProfileSchema } },
      description: "Perfil do usuário",
    },
    401: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Token ausente ou inválido",
    },
  },
});

export const updateMyProfileRoute = createRoute({
  method: "patch",
  path: "/me",
  tags: ["Users"],
  summary: "Atualizar meu perfil",
  description: "Atualiza nome e/ou e-mail do usuário autenticado.",
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: { "application/json": { schema: updateMyProfileRequestSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: userProfileSchema } },
      description: "Perfil atualizado",
    },
    401: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Token ausente ou inválido",
    },
    422: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Erro de validação",
    },
  },
});

// ========== Admin ==========

export const listUsersRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Users"],
  summary: "Listar usuários",
  description: "Lista usuários com paginação e filtros. Restrito a TENANT e OWNER.",
  security: [{ Bearer: [] }],
  request: {
    query: listUsersQuerySchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: paginatedUsersResponseSchema } },
      description: "Lista paginada de usuários",
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

export const getUserByIdRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Users"],
  summary: "Buscar usuário por ID",
  description: "Retorna um usuário pelo ID. Restrito a TENANT e OWNER.",
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: userProfileSchema } },
      description: "Usuário encontrado",
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
      description: "Usuário não encontrado",
    },
  },
});

export const updateUserRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["Users"],
  summary: "Atualizar usuário",
  description: "Atualiza dados de um usuário (nome, email, role, active). Restrito a OWNER.",
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: updateUserRequestSchema } }, required: true },
  },
  responses: {
    200: {
      content: { "application/json": { schema: userProfileSchema } },
      description: "Usuário atualizado",
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
      description: "Usuário não encontrado",
    },
    422: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Erro de validação",
    },
  },
});

// ========== Owner (Admin Key) ==========

export const createOwnerRoute = createRoute({
  method: "post",
  path: "/owner",
  tags: ["Owner"],
  summary: "Criar owner",
  description:
    "Cria um usuário com role OWNER a partir do telefone. Requer admin key no header X-Admin-Key.",
  security: [{ AdminKey: [] }],
  request: {
    body: {
      content: { "application/json": { schema: createOwnerRequestSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: userProfileSchema } },
      description: "Owner criado com sucesso",
    },
    401: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Admin key ausente ou inválida",
    },
    409: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Usuário já existe",
    },
    422: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Erro de validação",
    },
  },
});

export const updateOwnerRoute = createRoute({
  method: "patch",
  path: "/owner/{id}",
  tags: ["Owner"],
  summary: "Editar owner",
  description: "Atualiza dados de um owner existente. Requer admin key no header X-Admin-Key.",
  security: [{ AdminKey: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: { "application/json": { schema: updateOwnerRequestSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: userProfileSchema } },
      description: "Owner atualizado",
    },
    401: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Admin key ausente ou inválida",
    },
    404: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Owner não encontrado",
    },
    422: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Erro de validação",
    },
  },
});

// ========== Delete ==========

export const deleteUserRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Users"],
  summary: "Desativar usuário",
  description: "Desativa um usuário (soft delete). Restrito a OWNER.",
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: messageResponseSchema } },
      description: "Usuário desativado",
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
      description: "Usuário não encontrado",
    },
  },
});
