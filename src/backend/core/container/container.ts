import type { OpenAPIHono } from "@hono/zod-openapi";
import type { Config } from "../config/config.js";
import type { db } from "../db/connection.js";

/**
 * Container de dependências compartilhadas.
 * Injetado em todos os módulos e features no momento da criação.
 */
export type Container = {
  db: typeof db;
  config: Config;
};

/**
 * Assinatura de criação de um módulo.
 * Todo módulo (user, tenant, auth, etc.) deve exportar uma função com essa assinatura.
 *
 * Padrão no 1_module.ts:
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
 * Assinatura de criação de uma feature (sub-módulo).
 * Usada dentro de módulos compostos como booking/.
 *
 * Padrão no 1_feature.ts:
 * ```ts
 * export const createAvailabilityFeature: FeatureFactory = (container) => {
 *   const repository = new AvailabilityRepository(container.db);
 *   const service = new AvailabilityService(repository);
 *   const handler = new AvailabilityHandler(service);
 *
 *   const app = new OpenAPIHono();
 *   registerAvailabilityRoutes(app, handler);
 *   return app;
 * };
 * ```
 */
export type FeatureFactory = (container: Container) => OpenAPIHono;

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
