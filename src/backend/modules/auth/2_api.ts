import { createRoute } from "@hono/zod-openapi";
import {
  errorResponseSchema,
  loginRequestSchema,
  loginResponseSchema,
  logoutResponseSchema,
  refreshRequestSchema,
  refreshResponseSchema,
} from "./types/dtos/dtos.js";

export const loginRoute = createRoute({
  method: "post",
  path: "/login",
  tags: ["Auth"],
  summary: "Login via telefone",
  description: "Autentica um usuário pelo hash do telefone. Cria o usuário se não existir.",
  request: {
    body: { content: { "application/json": { schema: loginRequestSchema } }, required: true },
  },
  responses: {
    200: {
      content: { "application/json": { schema: loginResponseSchema } },
      description: "Login realizado com sucesso",
    },
    401: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Usuário inativo",
    },
    422: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Erro de validação",
    },
  },
});

export const refreshRoute = createRoute({
  method: "post",
  path: "/refresh",
  tags: ["Auth"],
  summary: "Renovar access token",
  description: "Troca um refresh token válido por um novo par de access + refresh token.",
  request: {
    body: { content: { "application/json": { schema: refreshRequestSchema } }, required: true },
  },
  responses: {
    200: {
      content: { "application/json": { schema: refreshResponseSchema } },
      description: "Tokens renovados com sucesso",
    },
    401: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Refresh token inválido ou expirado",
    },
  },
});

export const logoutRoute = createRoute({
  method: "post",
  path: "/logout",
  tags: ["Auth"],
  summary: "Logout",
  description: "Invalida todos os refresh tokens do usuário autenticado.",
  security: [{ Bearer: [] }],
  responses: {
    200: {
      content: { "application/json": { schema: logoutResponseSchema } },
      description: "Logout realizado com sucesso",
    },
    401: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Token de acesso ausente ou inválido",
    },
  },
});
