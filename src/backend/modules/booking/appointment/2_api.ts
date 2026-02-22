import { createRoute, z } from "@hono/zod-openapi";
import {
  appointmentProfileSchema,
  cancelAppointmentRequestSchema,
  createAppointmentRequestSchema,
  errorResponseSchema,
  listAppointmentsQuerySchema,
  paginatedAppointmentsResponseSchema,
} from "./types/dtos/dtos.js";

// ========== CREATE ==========

export const createAppointmentRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Appointments"],
  summary: "Criar agendamento",
  description:
    "Cria um agendamento a partir de um slot disponível e um serviço. O slot é marcado como BOOKED e o agendamento inicia com status PENDING.",
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: { "application/json": { schema: createAppointmentRequestSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: appointmentProfileSchema } },
      description: "Agendamento criado com sucesso",
    },
    401: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Token ausente ou inválido",
    },
    404: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Slot, operador ou serviço não encontrado",
    },
    409: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Slot não está disponível",
    },
    422: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Erro de validação",
    },
  },
});

// ========== LIST ==========

export const listAppointmentsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Appointments"],
  summary: "Listar agendamentos",
  description:
    "Lista agendamentos com paginação e filtros. A filtragem é aplicada automaticamente por role: USER vê apenas os próprios, OPERATOR vê onde é o profissional, TENANT vê os do tenant.",
  security: [{ Bearer: [] }],
  request: {
    query: listAppointmentsQuerySchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: paginatedAppointmentsResponseSchema } },
      description: "Lista paginada de agendamentos",
    },
    401: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Token ausente ou inválido",
    },
  },
});

// ========== GET BY ID ==========

export const getAppointmentByIdRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Appointments"],
  summary: "Buscar agendamento por ID",
  description: "Retorna um agendamento específico. Acesso restrito ao escopo do caller.",
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: appointmentProfileSchema } },
      description: "Agendamento encontrado",
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
      description: "Agendamento não encontrado",
    },
  },
});

// ========== CONFIRM ==========

export const confirmAppointmentRoute = createRoute({
  method: "patch",
  path: "/{id}/confirm",
  tags: ["Appointments"],
  summary: "Confirmar agendamento",
  description: "Altera o status de PENDING para CONFIRMED. Restrito a TENANT, OWNER e OPERATOR.",
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: appointmentProfileSchema } },
      description: "Agendamento confirmado",
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
      description: "Agendamento não encontrado",
    },
    409: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Status atual não permite confirmação",
    },
  },
});

// ========== CANCEL ==========

export const cancelAppointmentRoute = createRoute({
  method: "patch",
  path: "/{id}/cancel",
  tags: ["Appointments"],
  summary: "Cancelar agendamento",
  description:
    "Cancela um agendamento PENDING ou CONFIRMED. Libera o slot de volta para AVAILABLE. Qualquer usuário autenticado com acesso pode cancelar.",
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: { "application/json": { schema: cancelAppointmentRequestSchema } },
      required: false,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: appointmentProfileSchema } },
      description: "Agendamento cancelado",
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
      description: "Agendamento não encontrado",
    },
    409: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Status atual não permite cancelamento",
    },
  },
});

// ========== COMPLETE ==========

export const completeAppointmentRoute = createRoute({
  method: "patch",
  path: "/{id}/complete",
  tags: ["Appointments"],
  summary: "Concluir agendamento",
  description:
    "Marca um agendamento CONFIRMED como COMPLETED. Restrito a TENANT, OWNER e OPERATOR.",
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: appointmentProfileSchema } },
      description: "Agendamento concluído",
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
      description: "Agendamento não encontrado",
    },
    409: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Status atual não permite conclusão",
    },
  },
});
