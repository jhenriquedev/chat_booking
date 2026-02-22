import type { OpenAPIHono } from "@hono/zod-openapi";
import { respondError } from "../../../core/error/error.handler.js";
import { type Role, getSession } from "../../../core/session/session.guard.js";
import {
  createAvailabilityRuleRoute,
  deleteAvailabilityRuleRoute,
  listAvailabilityRulesRoute,
  updateAvailabilityRuleRoute,
} from "./2_api.js";
import type { IAvailabilityService } from "./4_service.js";

export interface IAvailabilityHandler {
  register(app: OpenAPIHono): void;
}

function hasRole(session: { role: Role }, ...allowed: Role[]): boolean {
  return allowed.includes(session.role);
}

export function createAvailabilityHandler(service: IAvailabilityService): IAvailabilityHandler {
  return {
    register(app: OpenAPIHono) {
      // POST / — TENANT, OWNER, OPERATOR
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(createAvailabilityRuleRoute, async (c): Promise<any> => {
        const session = getSession(c);
        if (!hasRole(session, "TENANT", "OWNER", "OPERATOR")) {
          return respondError(c, { code: "FORBIDDEN", message: "Permissão insuficiente" });
        }

        const body = c.req.valid("json");
        const result = await service.create(body, session.role, session.tenantId, session.sub);

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 201);
      });

      // GET / — TENANT, OWNER, OPERATOR
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(listAvailabilityRulesRoute, async (c): Promise<any> => {
        const session = getSession(c);
        if (!hasRole(session, "TENANT", "OWNER", "OPERATOR")) {
          return respondError(c, { code: "FORBIDDEN", message: "Permissão insuficiente" });
        }

        const query = c.req.valid("query");
        const result = await service.listByOperator(
          query,
          session.role,
          session.tenantId,
          session.sub,
        );

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 200);
      });

      // PATCH /:id — TENANT, OWNER, OPERATOR
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(updateAvailabilityRuleRoute, async (c): Promise<any> => {
        const session = getSession(c);
        if (!hasRole(session, "TENANT", "OWNER", "OPERATOR")) {
          return respondError(c, { code: "FORBIDDEN", message: "Permissão insuficiente" });
        }

        const { id } = c.req.valid("param");
        const body = c.req.valid("json");
        const result = await service.update(id, body, session.role, session.tenantId, session.sub);

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 200);
      });

      // DELETE /:id — TENANT, OWNER, OPERATOR
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(deleteAvailabilityRuleRoute, async (c): Promise<any> => {
        const session = getSession(c);
        if (!hasRole(session, "TENANT", "OWNER", "OPERATOR")) {
          return respondError(c, { code: "FORBIDDEN", message: "Permissão insuficiente" });
        }

        const { id } = c.req.valid("param");
        const result = await service.delete(id, session.role, session.tenantId, session.sub);

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 200);
      });
    },
  };
}
