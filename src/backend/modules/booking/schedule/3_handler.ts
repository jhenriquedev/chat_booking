import type { OpenAPIHono } from "@hono/zod-openapi";
import { respondError } from "../../../core/error/error.handler.js";
import { type Role, getSession } from "../../../core/session/session.guard.js";
import {
  deleteSlotRoute,
  generateSlotsRoute,
  listSlotsRoute,
  updateSlotStatusRoute,
} from "./2_api.js";
import type { IScheduleService } from "./4_service.js";

export interface IScheduleHandler {
  register(app: OpenAPIHono): void;
}

function hasRole(session: { role: Role }, ...allowed: Role[]): boolean {
  return allowed.includes(session.role);
}

export function createScheduleHandler(service: IScheduleService): IScheduleHandler {
  return {
    register(app: OpenAPIHono) {
      // POST /generate — TENANT, OWNER
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(generateSlotsRoute, async (c): Promise<any> => {
        const session = getSession(c);
        if (!hasRole(session, "TENANT", "OWNER")) {
          return respondError(c, { code: "FORBIDDEN", message: "Permissão insuficiente" });
        }

        const body = c.req.valid("json");
        const result = await service.generate(body, session.role, session.tenantId);

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 201);
      });

      // GET / — TENANT, OWNER, OPERATOR
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(listSlotsRoute, async (c): Promise<any> => {
        const session = getSession(c);
        if (!hasRole(session, "TENANT", "OWNER", "OPERATOR")) {
          return respondError(c, { code: "FORBIDDEN", message: "Permissão insuficiente" });
        }

        const query = c.req.valid("query");
        const result = await service.listByDate(query, session.role, session.tenantId, session.sub);

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 200);
      });

      // PATCH /:id — TENANT, OWNER, OPERATOR
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(updateSlotStatusRoute, async (c): Promise<any> => {
        const session = getSession(c);
        if (!hasRole(session, "TENANT", "OWNER", "OPERATOR")) {
          return respondError(c, { code: "FORBIDDEN", message: "Permissão insuficiente" });
        }

        const { id } = c.req.valid("param");
        const body = c.req.valid("json");
        const result = await service.updateStatus(
          id,
          body,
          session.role,
          session.tenantId,
          session.sub,
        );

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 200);
      });

      // DELETE /:id — TENANT, OWNER
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(deleteSlotRoute, async (c): Promise<any> => {
        const session = getSession(c);
        if (!hasRole(session, "TENANT", "OWNER")) {
          return respondError(c, { code: "FORBIDDEN", message: "Permissão insuficiente" });
        }

        const { id } = c.req.valid("param");
        const result = await service.deleteSlot(id, session.role, session.tenantId);

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 200);
      });
    },
  };
}
