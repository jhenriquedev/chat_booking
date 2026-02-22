import type { OpenAPIHono } from "@hono/zod-openapi";
import { respondError } from "../../core/error/error.handler.js";
import { getSession, hasRole } from "../../core/session/session.guard.js";
import {
  getNotificationByIdRoute,
  listNotificationsRoute,
  sendNotificationRoute,
} from "./2_api.js";
import type { INotificationService } from "./4_service.js";

export interface INotificationHandler {
  register(app: OpenAPIHono): void;
}

export function createNotificationHandler(service: INotificationService): INotificationHandler {
  return {
    register(app: OpenAPIHono) {
      // GET / — Qualquer autenticado (filtragem por role no service)
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(listNotificationsRoute, async (c): Promise<any> => {
        const session = getSession(c);
        const query = c.req.valid("query");
        const result = await service.list(query, session.role, session.sub, session.tenantId);

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 200);
      });

      // GET /:id — Qualquer autenticado (acesso verificado no service)
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(getNotificationByIdRoute, async (c): Promise<any> => {
        const session = getSession(c);
        const { id } = c.req.valid("param");
        const result = await service.getById(id, session.role, session.sub, session.tenantId);

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 200);
      });

      // POST /send — TENANT, OWNER
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(sendNotificationRoute, async (c): Promise<any> => {
        const session = getSession(c);
        if (!hasRole(session, "TENANT", "OWNER")) {
          return respondError(c, { code: "FORBIDDEN", message: "Permissão insuficiente" });
        }

        const body = c.req.valid("json");
        const result = await service.send(body, session.role, session.tenantId);

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 201);
      });
    },
  };
}
