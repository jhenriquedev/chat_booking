import { OpenAPIHono } from "@hono/zod-openapi";
import type { ModuleFactory } from "../../../core/container/container.js";
import { createAvailabilityHandler } from "./3_handler.js";
import { createAvailabilityService } from "./4_service.js";
import { createAvailabilityRepository } from "./5_repository.js";

export const createAvailabilityFeature: ModuleFactory = (container) => {
  const repository = createAvailabilityRepository(container);
  const service = createAvailabilityService(repository);
  const handler = createAvailabilityHandler(service);

  const app = new OpenAPIHono();
  handler.register(app);
  return app;
};
