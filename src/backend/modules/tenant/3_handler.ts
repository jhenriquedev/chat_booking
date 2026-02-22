import type { OpenAPIHono } from "@hono/zod-openapi";
import { respondError } from "../../core/error/error.handler.js";
import { type Role, getSession } from "../../core/session/session.guard.js";
import {
  createTenantRoute,
  deleteTenantRoute,
  getTenantByIdRoute,
  listTenantsRoute,
  updateTenantRoute,
} from "./2_api.js";
import type { ITenantService } from "./4_service.js";

export interface ITenantHandler {
  register(app: OpenAPIHono): void;
}

function hasRole(session: { role: Role }, ...allowed: Role[]): boolean {
  return allowed.includes(session.role);
}

export function createTenantHandler(service: ITenantService): ITenantHandler {
  return {
    register(app: OpenAPIHono) {
      // POST / — OWNER
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(createTenantRoute, async (c): Promise<any> => {
        const session = getSession(c);
        if (!hasRole(session, "OWNER")) {
          return respondError(c, { code: "FORBIDDEN", message: "Permissão insuficiente" });
        }

        const body = c.req.valid("json");
        const result = await service.create(body);

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 201);
      });

      // GET / — OWNER
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(listTenantsRoute, async (c): Promise<any> => {
        const session = getSession(c);
        if (!hasRole(session, "OWNER")) {
          return respondError(c, { code: "FORBIDDEN", message: "Permissão insuficiente" });
        }

        const query = c.req.valid("query");
        const result = await service.listAll(query);

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 200);
      });

      // GET /:id — TENANT (próprio), OWNER
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(getTenantByIdRoute, async (c): Promise<any> => {
        const session = getSession(c);
        if (!hasRole(session, "TENANT", "OWNER")) {
          return respondError(c, { code: "FORBIDDEN", message: "Permissão insuficiente" });
        }

        const { id } = c.req.valid("param");
        const result = await service.getById(id, session.role, session.tenantId);

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 200);
      });

      // PATCH /:id — OWNER
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(updateTenantRoute, async (c): Promise<any> => {
        const session = getSession(c);
        if (!hasRole(session, "OWNER")) {
          return respondError(c, { code: "FORBIDDEN", message: "Permissão insuficiente" });
        }

        const { id } = c.req.valid("param");
        const body = c.req.valid("json");
        const result = await service.update(id, body);

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 200);
      });

      // DELETE /:id — OWNER
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(deleteTenantRoute, async (c): Promise<any> => {
        const session = getSession(c);
        if (!hasRole(session, "OWNER")) {
          return respondError(c, { code: "FORBIDDEN", message: "Permissão insuficiente" });
        }

        const { id } = c.req.valid("param");
        const result = await service.delete(id);

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 200);
      });
    },
  };
}
