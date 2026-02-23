import type { OpenAPIHono } from "@hono/zod-openapi";
import { respondError } from "../../../core/error/error.handler.js";
import { getSession, hasRole } from "../../../core/session/session.guard.js";
import {
  cancelAppointmentRoute,
  completeAppointmentRoute,
  confirmAppointmentRoute,
  createAppointmentRoute,
  getAppointmentByIdRoute,
  listAppointmentsRoute,
  noShowAppointmentRoute,
} from "./2_api.js";
import type { IAppointmentService } from "./4_service.js";

export interface IAppointmentHandler {
  register(app: OpenAPIHono): void;
}

export function createAppointmentHandler(service: IAppointmentService): IAppointmentHandler {
  return {
    register(app: OpenAPIHono) {
      // POST / — Qualquer autenticado
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(createAppointmentRoute, async (c): Promise<any> => {
        const session = getSession(c);
        const body = c.req.valid("json");
        const result = await service.create(body, session.sub);

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 201);
      });

      // GET / — Qualquer autenticado (filtragem por role no service)
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(listAppointmentsRoute, async (c): Promise<any> => {
        const session = getSession(c);
        const query = c.req.valid("query");
        const result = await service.list(query, session.role, session.sub, session.tenantId);

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 200);
      });

      // GET /:id — Qualquer autenticado (acesso verificado no service)
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(getAppointmentByIdRoute, async (c): Promise<any> => {
        const session = getSession(c);
        const { id } = c.req.valid("param");
        const result = await service.getById(id, session.role, session.sub, session.tenantId);

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 200);
      });

      // PATCH /:id/confirm — TENANT, OWNER, OPERATOR
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(confirmAppointmentRoute, async (c): Promise<any> => {
        const session = getSession(c);
        if (!hasRole(session, "TENANT", "OWNER", "OPERATOR")) {
          return respondError(c, { code: "FORBIDDEN", message: "Permissão insuficiente" });
        }

        const { id } = c.req.valid("param");
        const result = await service.confirm(id, session.role, session.sub, session.tenantId);

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 200);
      });

      // PATCH /:id/cancel — Qualquer autenticado (acesso verificado no service)
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(cancelAppointmentRoute, async (c): Promise<any> => {
        const session = getSession(c);
        const { id } = c.req.valid("param");
        const body = c.req.valid("json") ?? {};
        const result = await service.cancel(id, body, session.role, session.sub, session.tenantId);

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 200);
      });

      // PATCH /:id/complete — TENANT, OWNER, OPERATOR
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(completeAppointmentRoute, async (c): Promise<any> => {
        const session = getSession(c);
        if (!hasRole(session, "TENANT", "OWNER", "OPERATOR")) {
          return respondError(c, { code: "FORBIDDEN", message: "Permissão insuficiente" });
        }

        const { id } = c.req.valid("param");
        const result = await service.complete(id, session.role, session.sub, session.tenantId);

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 200);
      });

      // PATCH /:id/no-show — TENANT, OWNER, OPERATOR
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(noShowAppointmentRoute, async (c): Promise<any> => {
        const session = getSession(c);
        if (!hasRole(session, "TENANT", "OWNER", "OPERATOR")) {
          return respondError(c, { code: "FORBIDDEN", message: "Permissão insuficiente" });
        }

        const { id } = c.req.valid("param");
        const result = await service.noShow(id, session.role, session.sub, session.tenantId);

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 200);
      });
    },
  };
}
