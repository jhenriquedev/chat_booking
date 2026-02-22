import { createRoute, z } from "@hono/zod-openapi";
import {
  availabilityRuleProfileSchema,
  createAvailabilityRuleRequestSchema,
  errorResponseSchema,
  listAvailabilityRulesQuerySchema,
  messageResponseSchema,
  updateAvailabilityRuleRequestSchema,
} from "./types/dtos/dtos.js";

// ========== CREATE ==========

export const createAvailabilityRuleRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Availability"],
  summary: "Criar regra de disponibilidade",
  description:
    "Cria uma regra de disponibilidade semanal para um operador. Não permite sobreposição de horários no mesmo dia.",
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: { "application/json": { schema: createAvailabilityRuleRequestSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: availabilityRuleProfileSchema } },
      description: "Regra criada com sucesso",
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
    409: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Horários sobrepostos",
    },
    422: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Erro de validação",
    },
  },
});

// ========== LIST ==========

export const listAvailabilityRulesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Availability"],
  summary: "Listar regras de disponibilidade",
  description:
    "Lista as regras de disponibilidade de um operador. operatorId é obrigatório na query.",
  security: [{ Bearer: [] }],
  request: {
    query: listAvailabilityRulesQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": { schema: z.array(availabilityRuleProfileSchema) },
      },
      description: "Lista de regras de disponibilidade",
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

export const updateAvailabilityRuleRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["Availability"],
  summary: "Atualizar regra de disponibilidade",
  description:
    "Atualiza uma regra de disponibilidade. OPERATOR só edita as próprias regras; TENANT só edita regras do próprio tenant.",
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: { "application/json": { schema: updateAvailabilityRuleRequestSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: availabilityRuleProfileSchema } },
      description: "Regra atualizada",
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
      description: "Regra não encontrada",
    },
    409: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Horários sobrepostos",
    },
    422: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Erro de validação",
    },
  },
});

// ========== DELETE ==========

export const deleteAvailabilityRuleRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Availability"],
  summary: "Desativar regra de disponibilidade",
  description:
    "Desativa uma regra de disponibilidade (soft delete). OPERATOR só desativa as próprias; TENANT só desativa do próprio tenant.",
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: messageResponseSchema } },
      description: "Regra desativada",
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
      description: "Regra não encontrada",
    },
  },
});
