import { OpenAPIHono } from "@hono/zod-openapi";
import type { ModuleFactory } from "../../../core/container/container.js";
import { createAppointmentHandler } from "./3_handler.js";
import { createAppointmentService } from "./4_service.js";
import { createAppointmentRepository } from "./5_repository.js";

export const createAppointmentFeature: ModuleFactory = (container) => {
  const repository = createAppointmentRepository(container);
  const service = createAppointmentService(repository);
  const handler = createAppointmentHandler(service);

  const app = new OpenAPIHono();
  handler.register(app);
  return app;
};
