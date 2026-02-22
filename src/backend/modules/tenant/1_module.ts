import { OpenAPIHono } from "@hono/zod-openapi";
import type { ModuleFactory } from "../../core/container/container.js";
import { createTenantHandler } from "./3_handler.js";
import { createTenantService } from "./4_service.js";
import { createTenantRepository } from "./5_repository.js";

export const createTenantModule: ModuleFactory = (container) => {
  const repository = createTenantRepository(container);
  const service = createTenantService(repository);
  const handler = createTenantHandler(service);

  const app = new OpenAPIHono();
  handler.register(app);
  return app;
};
