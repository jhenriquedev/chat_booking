import { OpenAPIHono } from "@hono/zod-openapi";
import type { ModuleFactory } from "../../../core/container/container.js";
import { createScheduleHandler } from "./3_handler.js";
import { createScheduleService } from "./4_service.js";
import { createScheduleRepository } from "./5_repository.js";

export const createScheduleFeature: ModuleFactory = (container) => {
  const repository = createScheduleRepository(container);
  const service = createScheduleService(repository);
  const handler = createScheduleHandler(service);

  const app = new OpenAPIHono();
  handler.register(app);
  return app;
};
