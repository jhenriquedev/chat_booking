import { createRoute, z } from "@hono/zod-openapi";
import {
  errorResponseSchema,
  generateSlotsRequestSchema,
  generateSlotsResponseSchema,
  listSlotsQuerySchema,
  messageResponseSchema,
  scheduleSlotProfileSchema,
  updateSlotStatusRequestSchema,
} from "./types/dtos/dtos.js";

// ========== GENERATE ==========

export const generateSlotsRoute = createRoute({
  method: "post",
  path: "/generate",
  tags: ["Schedule"],
  summary: "Gerar slots de agenda",
  description:
    "Gera slots concretos a partir das regras de disponibilidade do operador para um range de datas. Não gera duplicados.",
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: { "application/json": { schema: generateSlotsRequestSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: generateSlotsResponseSchema } },
      description: "Slots gerados com sucesso",
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
      description: "Operador ou regras não encontradas",
    },
    422: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Erro de validação",
    },
  },
});

// ========== LIST ==========

export const listSlotsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Schedule"],
  summary: "Listar slots por data",
  description:
    "Lista os slots de um operador para uma data específica. operatorId e date são obrigatórios.",
  security: [{ Bearer: [] }],
  request: {
    query: listSlotsQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": { schema: z.array(scheduleSlotProfileSchema) },
      },
      description: "Lista de slots",
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

// ========== UPDATE STATUS ==========

export const updateSlotStatusRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["Schedule"],
  summary: "Bloquear ou liberar slot",
  description:
    "Altera o status de um slot entre AVAILABLE e BLOCKED. Slots com status BOOKED não podem ser alterados.",
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: { "application/json": { schema: updateSlotStatusRequestSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: scheduleSlotProfileSchema } },
      description: "Status atualizado",
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
      description: "Slot não encontrado",
    },
    409: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Slot com agendamento ativo",
    },
    422: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Erro de validação",
    },
  },
});

// ========== DELETE ==========

export const deleteSlotRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Schedule"],
  summary: "Remover slot",
  description:
    "Remove fisicamente um slot da agenda. Slots com status BOOKED não podem ser removidos.",
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: messageResponseSchema } },
      description: "Slot removido",
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
      description: "Slot não encontrado",
    },
    409: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Slot com agendamento ativo",
    },
  },
});
