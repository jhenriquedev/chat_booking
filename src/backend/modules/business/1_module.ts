import { OpenAPIHono } from "@hono/zod-openapi";
import type { ModuleFactory } from "../../core/container/container.js";
import { createBusinessHandler } from "./3_handler.js";
import { createBusinessService } from "./4_service.js";
import { createBusinessRepository } from "./5_repository.js";

export const createBusinessModule: ModuleFactory = (container) => {
  const repository = createBusinessRepository(container);
  const service = createBusinessService(repository);
  const handler = createBusinessHandler(service);

  const app = new OpenAPIHono();
  handler.register(app);
  return app;
};
