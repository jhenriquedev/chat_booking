import { createRoute, z } from "@hono/zod-openapi";
import {
  createServiceRequestSchema,
  errorResponseSchema,
  listServicesQuerySchema,
  messageResponseSchema,
  paginatedServicesResponseSchema,
  serviceProfileSchema,
  updateServiceRequestSchema,
} from "./types/dtos/dtos.js";

// ========== CREATE ==========

export const createServiceRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Services"],
  summary: "Criar serviço",
  description:
    "Cria um novo serviço vinculado a uma business. TENANT só cria em suas businesses; OWNER cria em qualquer.",
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: { "application/json": { schema: createServiceRequestSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: serviceProfileSchema } },
      description: "Serviço criado com sucesso",
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
      description: "Business não encontrada",
    },
    422: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Erro de validação",
    },
  },
});

// ========== LIST ==========

export const listServicesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Services"],
  summary: "Listar serviços",
  description: "Lista serviços de uma business com paginação. businessId é obrigatório na query.",
  security: [{ Bearer: [] }],
  request: {
    query: listServicesQuerySchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: paginatedServicesResponseSchema } },
      description: "Lista paginada de serviços",
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

export const getServiceByIdRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Services"],
  summary: "Buscar serviço por ID",
  description:
    "Retorna um serviço pelo ID. TENANT vê apenas serviços de suas businesses; OPERATOR vê serviços da sua business.",
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: serviceProfileSchema } },
      description: "Serviço encontrado",
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
      description: "Serviço não encontrado",
    },
  },
});

// ========== UPDATE ==========

export const updateServiceRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["Services"],
  summary: "Atualizar serviço",
  description:
    "Atualiza dados de um serviço. TENANT só edita serviços de suas businesses; OWNER edita todos.",
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: { "application/json": { schema: updateServiceRequestSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: serviceProfileSchema } },
      description: "Serviço atualizado",
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
      description: "Serviço não encontrado",
    },
    422: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Erro de validação",
    },
  },
});

// ========== DELETE ==========

export const deleteServiceRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Services"],
  summary: "Desativar serviço",
  description: "Desativa um serviço (soft delete). TENANT só desativa serviços de suas businesses.",
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: messageResponseSchema } },
      description: "Serviço desativado",
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
      description: "Serviço não encontrado",
    },
  },
});
