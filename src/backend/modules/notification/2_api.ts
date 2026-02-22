import { createRoute, z } from "@hono/zod-openapi";
import {
  errorResponseSchema,
  listNotificationsQuerySchema,
  notificationProfileSchema,
  paginatedNotificationsResponseSchema,
  sendNotificationRequestSchema,
} from "./types/dtos/dtos.js";

// ========== LIST ==========

export const listNotificationsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Notifications"],
  summary: "Listar notificações",
  description:
    "Lista notificações com paginação e filtros. A filtragem é aplicada automaticamente por role: USER vê apenas as próprias, OPERATOR vê de seus appointments, TENANT vê do tenant.",
  security: [{ Bearer: [] }],
  request: {
    query: listNotificationsQuerySchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: paginatedNotificationsResponseSchema } },
      description: "Lista paginada de notificações",
    },
    401: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Token ausente ou inválido",
    },
  },
});

// ========== GET BY ID ==========

export const getNotificationByIdRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Notifications"],
  summary: "Buscar notificação por ID",
  description: "Retorna uma notificação específica. Acesso restrito ao escopo do caller.",
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: notificationProfileSchema } },
      description: "Notificação encontrada",
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
      description: "Notificação não encontrada",
    },
  },
});

// ========== SEND ==========

export const sendNotificationRoute = createRoute({
  method: "post",
  path: "/send",
  tags: ["Notifications"],
  summary: "Disparar notificação manual",
  description:
    "Cria uma notificação com status PENDING para um appointment existente. Restrito a TENANT e OWNER. A integração com canais externos será implementada futuramente.",
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: { "application/json": { schema: sendNotificationRequestSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: notificationProfileSchema } },
      description: "Notificação criada com sucesso",
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
      description: "Appointment não encontrado",
    },
    422: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Erro de validação",
    },
  },
});
