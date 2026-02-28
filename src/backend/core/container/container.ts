import type { OpenAPIHono } from "@hono/zod-openapi";
import type { Config } from "../config/config.js";
import type { db } from "../db/connection.js";
import type { redis } from "../redis/connection.js";

/**
 * Container de dependências compartilhadas.
 * Injetado em todos os módulos e features no momento da criação.
 */
export type Container = {
  db: typeof db;
  redis: typeof redis;
  config: Config;
};

/**
 * Assinatura de criação de um módulo ou feature.
 * Todo módulo (1_module.ts) e feature (1_feature.ts) deve exportar
 * uma função com essa assinatura.
 *
 * ```ts
 * export const createUserModule: ModuleFactory = (container) => {
 *   const repository = new UserRepository(container.db);
 *   const service = new UserService(repository);
 *   const handler = new UserHandler(service);
 *
 *   const app = new OpenAPIHono();
 *   registerUserRoutes(app, handler);
 *   return app;
 * };
 * ```
 */
export type ModuleFactory = (container: Container) => OpenAPIHono;

/**
 * Registra módulos no app principal.
 *
 * Uso no server.ts:
 * ```ts
 * registerModules(app, container, {
 *   "/api/auth": createAuthModule,
 *   "/api/users": createUserModule,
 *   "/api/bookings": createBookingModule,
 * });
 * ```
 */
export const registerModules = (
  app: OpenAPIHono,
  container: Container,
  modules: Record<string, ModuleFactory>,
) => {
  for (const [path, factory] of Object.entries(modules)) {
    app.route(path, factory(container));
  }
};
