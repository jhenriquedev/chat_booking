import { OpenAPIHono } from "@hono/zod-openapi";
import type { ModuleFactory } from "../../core/container/container.js";
import { createUserHandler } from "./3_handler.js";
import { createUserService } from "./4_service.js";
import { createUserRepository } from "./5_repository.js";

export const createUserModule: ModuleFactory = (container) => {
  const repository = createUserRepository(container);
  const service = createUserService(repository);
  const handler = createUserHandler(service, container.config);

  const app = new OpenAPIHono();
  handler.register(app);
  return app;
};
