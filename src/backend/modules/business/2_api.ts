import { createRoute, z } from "@hono/zod-openapi";
import {
  businessProfileSchema,
  createBusinessRequestSchema,
  errorResponseSchema,
  listBusinessesQuerySchema,
  messageResponseSchema,
  paginatedBusinessesResponseSchema,
  updateBusinessRequestSchema,
} from "./types/dtos/dtos.js";

// ========== CREATE ==========

export const createBusinessRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Businesses"],
  summary: "Criar business",
  description:
    "Cria um novo business vinculado a um tenant. TENANT usa o próprio tenantId; OWNER informa no body.",
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: { "application/json": { schema: createBusinessRequestSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: businessProfileSchema } },
      description: "Business criado com sucesso",
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
      description: "Slug já existe",
    },
    422: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Erro de validação",
    },
  },
});

// ========== LIST ==========

export const listBusinessesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Businesses"],
  summary: "Listar businesses",
  description: "Lista businesses com paginação. TENANT vê apenas suas businesses; OWNER vê todas.",
  security: [{ Bearer: [] }],
  request: {
    query: listBusinessesQuerySchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: paginatedBusinessesResponseSchema } },
      description: "Lista paginada de businesses",
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

// ========== GET BY SLUG (público) ==========

export const getBusinessBySlugRoute = createRoute({
  method: "get",
  path: "/slug/{slug}",
  tags: ["Businesses"],
  summary: "Buscar business por slug",
  description:
    "Busca um business pelo slug. Endpoint público (sem autenticação) para uso do chatbot.",
  request: {
    params: z.object({
      slug: z
        .string()
        .regex(
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
          "Slug deve conter apenas letras minúsculas, números e hífens",
        ),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: businessProfileSchema } },
      description: "Business encontrado",
    },
    404: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Business não encontrado",
    },
  },
});

// ========== GET BY ID ==========

export const getBusinessByIdRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Businesses"],
  summary: "Buscar business por ID",
  description:
    "Retorna um business pelo ID. TENANT vê apenas suas businesses; OPERATOR vê sua business.",
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: businessProfileSchema } },
      description: "Business encontrado",
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
      description: "Business não encontrado",
    },
  },
});

// ========== UPDATE ==========

export const updateBusinessRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["Businesses"],
  summary: "Atualizar business",
  description: "Atualiza dados de um business. TENANT só edita suas businesses; OWNER edita todas.",
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: { "application/json": { schema: updateBusinessRequestSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: businessProfileSchema } },
      description: "Business atualizado",
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
      description: "Business não encontrado",
    },
    409: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Slug já existe",
    },
    422: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Erro de validação",
    },
  },
});

// ========== DELETE ==========

export const deleteBusinessRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Businesses"],
  summary: "Desativar business",
  description: "Desativa um business (soft delete). TENANT só desativa suas businesses.",
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: messageResponseSchema } },
      description: "Business desativado",
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
      description: "Business não encontrado",
    },
  },
});
