import { serve } from "@hono/node-server";
import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import { config } from "./core/config/config.js";
import { type Container, registerModules } from "./core/container/container.js";
import { db } from "./core/db/connection.js";
import { errorHandler } from "./core/error/error.handler.js";
import { loggerMiddleware } from "./core/logger/logger.middleware.js";
import { sessionGuard } from "./core/session/session.guard.js";
import { createAuthModule } from "./modules/auth/1_module.js";

const app = new OpenAPIHono();

// Error handler global
app.onError(errorHandler);

// Logs em todas as rotas
app.use("*", loggerMiddleware);

// Health check (público)
app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

// Paths públicos (não exigem JWT)
const publicPaths = ["/api/auth/login", "/api/auth/refresh"];

// Auth obrigatória nas rotas de API (exceto paths públicos)
app.use("/api/*", async (c, next) => {
  if (publicPaths.includes(c.req.path)) return next();
  return sessionGuard(c, next);
});

// Container de dependências
const container: Container = { db, config };

// Módulos
registerModules(app, container, {
  "/api/auth": createAuthModule,
  // "/api/users": createUserModule,
  // "/api/tenants": createTenantModule,
  // "/api/businesses": createBusinessModule,
  // "/api/operators": createOperatorModule,
  // "/api/services": createServicesModule,
  // "/api/bookings": createBookingModule,
  // "/api/notifications": createNotificationModule,
});

// Security scheme para rotas protegidas
app.openAPIRegistry.registerComponent("securitySchemes", "Bearer", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description: "Access token JWT (HS256)",
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

console.log(`Server running on http://localhost:${config.PORT}`);
console.log(`Swagger UI: http://localhost:${config.PORT}/swagger`);
console.log(`Scalar docs: http://localhost:${config.PORT}/docs`);
console.log(`OpenAPI spec: http://localhost:${config.PORT}/openapi.json`);

serve({
  fetch: app.fetch,
  port: config.PORT,
});

export default app;
