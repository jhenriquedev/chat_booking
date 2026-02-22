import { serve } from "@hono/node-server";
import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";

const app = new OpenAPIHono();

// Health check
app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

// TODO: montar módulos de modules/index.ts

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

const port = Number(process.env.PORT) || 3000;

console.log(`Server running on http://localhost:${port}`);
console.log(`Swagger UI: http://localhost:${port}/swagger`);
console.log(`Scalar docs: http://localhost:${port}/docs`);
console.log(`OpenAPI spec: http://localhost:${port}/openapi.json`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
