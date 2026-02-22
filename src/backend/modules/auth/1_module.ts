import { OpenAPIHono } from "@hono/zod-openapi";
import type { ModuleFactory } from "../../core/container/container.js";
import { createAuthHandler } from "./3_handler.js";
import { createAuthService } from "./4_service.js";
import { createAuthRepository } from "./5_repository.js";

export const createAuthModule: ModuleFactory = (container) => {
  const repository = createAuthRepository(container);
  const service = createAuthService(container.config, repository);
  const handler = createAuthHandler(service);

  const app = new OpenAPIHono();
  handler.register(app);

  return app;
};
