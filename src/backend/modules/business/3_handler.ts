import type { OpenAPIHono } from "@hono/zod-openapi";
import { respondError } from "../../core/error/error.handler.js";
import { getSession, hasRole } from "../../core/session/session.guard.js";
import {
  createBusinessRoute,
  deleteBusinessRoute,
  getBusinessByIdRoute,
  getBusinessBySlugRoute,
  listBusinessesRoute,
  updateBusinessRoute,
} from "./2_api.js";
import type { IBusinessService } from "./4_service.js";

export interface IBusinessHandler {
  register(app: OpenAPIHono): void;
}

export function createBusinessHandler(service: IBusinessService): IBusinessHandler {
  return {
    register(app: OpenAPIHono) {
      // POST / — TENANT, OWNER
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(createBusinessRoute, async (c): Promise<any> => {
        const session = getSession(c);
        if (!hasRole(session, "TENANT", "OWNER")) {
          return respondError(c, { code: "FORBIDDEN", message: "Permissão insuficiente" });
        }

        const body = c.req.valid("json");
        const result = await service.create(body, session.role, session.tenantId);

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 201);
      });

      // GET / — TENANT, OWNER
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(listBusinessesRoute, async (c): Promise<any> => {
        const session = getSession(c);
        if (!hasRole(session, "TENANT", "OWNER")) {
          return respondError(c, { code: "FORBIDDEN", message: "Permissão insuficiente" });
        }

        const query = c.req.valid("query");
        const result = await service.listAll(query, session.role, session.tenantId);

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 200);
      });

      // GET /slug/:slug — Público
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(getBusinessBySlugRoute, async (c): Promise<any> => {
        const { slug } = c.req.valid("param");
        const result = await service.getBySlug(slug);

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 200);
      });

      // GET /:id — TENANT, OWNER, OPERATOR
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(getBusinessByIdRoute, async (c): Promise<any> => {
        const session = getSession(c);
        if (!hasRole(session, "TENANT", "OWNER", "OPERATOR")) {
          return respondError(c, { code: "FORBIDDEN", message: "Permissão insuficiente" });
        }

        const { id } = c.req.valid("param");
        const result = await service.getById(
          id,
          session.role,
          session.tenantId,
          session.businessId,
        );

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 200);
      });

      // PATCH /:id — TENANT, OWNER
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(updateBusinessRoute, async (c): Promise<any> => {
        const session = getSession(c);
        if (!hasRole(session, "TENANT", "OWNER")) {
          return respondError(c, { code: "FORBIDDEN", message: "Permissão insuficiente" });
        }

        const { id } = c.req.valid("param");
        const body = c.req.valid("json");
        const result = await service.update(id, body, session.role, session.tenantId);

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 200);
      });

      // DELETE /:id — TENANT, OWNER
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(deleteBusinessRoute, async (c): Promise<any> => {
        const session = getSession(c);
        if (!hasRole(session, "TENANT", "OWNER")) {
          return respondError(c, { code: "FORBIDDEN", message: "Permissão insuficiente" });
        }

        const { id } = c.req.valid("param");
        const result = await service.delete(id, session.role, session.tenantId);

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 200);
      });
    },
  };
}
