import { OpenAPIHono } from "@hono/zod-openapi";
import type { ModuleFactory } from "../../core/container/container.js";
import { createOperatorHandler } from "./3_handler.js";
import { createOperatorService } from "./4_service.js";
import { createOperatorRepository } from "./5_repository.js";

export const createOperatorModule: ModuleFactory = (container) => {
  const repository = createOperatorRepository(container);
  const service = createOperatorService(repository);
  const handler = createOperatorHandler(service);

  const app = new OpenAPIHono();
  handler.register(app);
  return app;
};
