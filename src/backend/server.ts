import { serve } from "@hono/node-server";
import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import { config } from "./core/config/config.js";
import { type Container, registerModules } from "./core/container/container.js";
import { db } from "./core/db/connection.js";
import { errorHandler } from "./core/error/error.handler.js";
import { logger } from "./core/logger/logger.js";
import { loggerMiddleware } from "./core/logger/logger.middleware.js";
import { rateLimiter } from "./core/rate-limit/rate-limit.middleware.js";
import { redis } from "./core/redis/connection.js";
import { sessionGuard } from "./core/session/session.guard.js";
import { createAuthModule } from "./modules/auth/1_module.js";
import { createAppointmentFeature } from "./modules/booking/appointment/1_feature.js";
import { createAvailabilityFeature } from "./modules/booking/availability/1_feature.js";
import { createScheduleFeature } from "./modules/booking/schedule/1_feature.js";
import { createBusinessModule } from "./modules/business/1_module.js";
import { createNotificationModule } from "./modules/notification/1_module.js";
import { createOperatorModule } from "./modules/operator/1_module.js";
import { createServiceModule } from "./modules/services/1_module.js";
import { createTenantModule } from "./modules/tenant/1_module.js";
import { createUserModule } from "./modules/user/1_module.js";

const app = new OpenAPIHono();

// Error handler global
app.onError(errorHandler);

// Logs em todas as rotas
app.use("*", loggerMiddleware);

// Rate limiting em endpoints públicos (antes do auth)
app.use(
  "/api/auth/login",
  rateLimiter({ redis, prefix: "login", windowMs: 60_000, maxRequests: 5 }),
);
app.use(
  "/api/auth/refresh",
  rateLimiter({ redis, prefix: "refresh", windowMs: 60_000, maxRequests: 10 }),
);
app.use(
  "/api/users/owner/*",
  rateLimiter({ redis, prefix: "owner", windowMs: 60_000, maxRequests: 3 }),
);

// Health check (público)
app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

// Paths públicos (não exigem JWT)
const publicPaths = ["/api/auth/login", "/api/auth/refresh"];
const publicPrefixes = ["/api/users/owner", "/api/businesses/slug"];

// Auth obrigatória nas rotas de API (exceto paths públicos)
app.use("/api/*", async (c, next) => {
  if (publicPaths.includes(c.req.path)) return next();
  if (publicPrefixes.some((p) => c.req.path.startsWith(p))) return next();
  return sessionGuard(c, next);
});

// Container de dependências
const container: Container = { db, redis, config };

// Módulos
registerModules(app, container, {
  "/api/auth": createAuthModule,
  "/api/users": createUserModule,
  "/api/tenants": createTenantModule,
  "/api/businesses": createBusinessModule,
  "/api/services": createServiceModule,
  "/api/operators": createOperatorModule,
  "/api/availability": createAvailabilityFeature,
  "/api/schedule": createScheduleFeature,
  "/api/appointments": createAppointmentFeature,
  "/api/notifications": createNotificationModule,
});

// Security schemes para rotas protegidas
app.openAPIRegistry.registerComponent("securitySchemes", "Bearer", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description: "Access token JWT (HS256)",
});

app.openAPIRegistry.registerComponent("securitySchemes", "AdminKey", {
  type: "apiKey",
  in: "header",
  name: "X-Admin-Key",
  description: "Chave administrativa para gerenciamento de owners",
});

// OpenAPI spec (JSON)
app.doc("/openapi.json", {
  openapi: "3.1.0",
  info: {
    title: "Chat Booking API",
    version: "0.1.0",
    description: "API de agendamentos via chatbot multi-tenant",
  },
});

// Swagger UI
app.get("/swagger", swaggerUI({ url: "/openapi.json" }));

// Scalar docs
app.get(
  "/docs",
  apiReference({
    spec: {
      url: "/openapi.json",
    },
  }),
);

logger.info(`Server running on http://localhost:${config.PORT}`);
logger.info(`Swagger UI: http://localhost:${config.PORT}/swagger`);
logger.info(`Scalar docs: http://localhost:${config.PORT}/docs`);
logger.info(`OpenAPI spec: http://localhost:${config.PORT}/openapi.json`);

serve({
  fetch: app.fetch,
  port: config.PORT,
});

export default app;
