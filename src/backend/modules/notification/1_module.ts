import { OpenAPIHono } from "@hono/zod-openapi";
import type { ModuleFactory } from "../../core/container/container.js";
import { createNotificationHandler } from "./3_handler.js";
import { createNotificationService } from "./4_service.js";
import { createNotificationRepository } from "./5_repository.js";

export const createNotificationModule: ModuleFactory = (container) => {
  const repository = createNotificationRepository(container);
  const service = createNotificationService(repository);
  const handler = createNotificationHandler(service);

  const app = new OpenAPIHono();
  handler.register(app);
  return app;
};
