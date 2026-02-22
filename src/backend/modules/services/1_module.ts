import { OpenAPIHono } from "@hono/zod-openapi";
import type { ModuleFactory } from "../../core/container/container.js";
import { createServiceHandler } from "./3_handler.js";
import { createServiceService } from "./4_service.js";
import { createServiceRepository } from "./5_repository.js";

export const createServiceModule: ModuleFactory = (container) => {
  const repository = createServiceRepository(container);
  const service = createServiceService(repository);
  const handler = createServiceHandler(service);

  const app = new OpenAPIHono();
  handler.register(app);
  return app;
};
