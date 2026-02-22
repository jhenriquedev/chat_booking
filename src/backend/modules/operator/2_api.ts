import { createRoute, z } from "@hono/zod-openapi";
import {
  createOperatorRequestSchema,
  errorResponseSchema,
  linkServiceRequestSchema,
  listOperatorsQuerySchema,
  messageResponseSchema,
  operatorProfileSchema,
  operatorServiceProfileSchema,
  paginatedOperatorsResponseSchema,
  updateOperatorRequestSchema,
} from "./types/dtos/dtos.js";

// ========== CREATE ==========

export const createOperatorRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Operators"],
  summary: "Criar operador",
  description:
    "Cria um novo operador vinculado a um user e uma business. Promove o role do user para OPERATOR.",
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: { "application/json": { schema: createOperatorRequestSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: operatorProfileSchema } },
      description: "Operador criado com sucesso",
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
      description: "Usuário ou business não encontrado",
    },
    409: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Usuário já é operador",
    },
    422: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Erro de validação",
    },
  },
});

// ========== LIST ==========

export const listOperatorsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Operators"],
  summary: "Listar operadores",
  description: "Lista operadores de uma business com paginação. businessId é obrigatório na query.",
  security: [{ Bearer: [] }],
  request: {
    query: listOperatorsQuerySchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: paginatedOperatorsResponseSchema } },
      description: "Lista paginada de operadores",
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

export const getOperatorByIdRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Operators"],
  summary: "Buscar operador por ID",
  description:
    "Retorna um operador pelo ID. OPERATOR só vê a si mesmo; TENANT vê operadores do próprio tenant.",
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: operatorProfileSchema } },
      description: "Operador encontrado",
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
      description: "Operador não encontrado",
    },
  },
});

// ========== UPDATE ==========

export const updateOperatorRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["Operators"],
  summary: "Atualizar operador",
  description:
    "Atualiza dados de um operador. TENANT só edita operadores do próprio tenant; OWNER edita todos.",
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: { "application/json": { schema: updateOperatorRequestSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: operatorProfileSchema } },
      description: "Operador atualizado",
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
      description: "Operador não encontrado",
    },
    422: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Erro de validação",
    },
  },
});

// ========== DELETE ==========

export const deleteOperatorRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Operators"],
  summary: "Desativar operador",
  description:
    "Desativa um operador (soft delete). TENANT só desativa operadores do próprio tenant.",
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: messageResponseSchema } },
      description: "Operador desativado",
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
      description: "Operador não encontrado",
    },
  },
});

// ========== LINK SERVICE ==========

export const linkServiceRoute = createRoute({
  method: "post",
  path: "/{id}/services",
  tags: ["Operators"],
  summary: "Vincular serviço ao operador",
  description:
    "Vincula um serviço ao operador com override opcional de preço e duração. O serviço deve pertencer à mesma business.",
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: { "application/json": { schema: linkServiceRequestSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: operatorServiceProfileSchema } },
      description: "Serviço vinculado com sucesso",
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
      description: "Operador ou serviço não encontrado",
    },
    409: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Serviço já vinculado ao operador",
    },
    422: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Erro de validação",
    },
  },
});

// ========== UNLINK SERVICE ==========

export const unlinkServiceRoute = createRoute({
  method: "delete",
  path: "/{id}/services/{serviceId}",
  tags: ["Operators"],
  summary: "Desvincular serviço do operador",
  description: "Remove o vínculo entre um operador e um serviço (soft delete).",
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
      serviceId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: messageResponseSchema } },
      description: "Serviço desvinculado",
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
      description: "Operador ou vínculo não encontrado",
    },
  },
});
