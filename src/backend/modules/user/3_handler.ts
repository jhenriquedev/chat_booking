import type { OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import type { Config } from "../../core/config/config.js";
import { respondError } from "../../core/error/error.handler.js";
import { getSession, hasRole } from "../../core/session/session.guard.js";
import {
  createOwnerRoute,
  deleteUserRoute,
  getMyProfileRoute,
  getUserByIdRoute,
  listUsersRoute,
  updateMyProfileRoute,
  updateOwnerRoute,
  updateUserRoute,
} from "./2_api.js";
import type { IUserService } from "./4_service.js";

export interface IUserHandler {
  register(app: OpenAPIHono): void;
}

/** Valida a admin key do header X-Admin-Key */
function validateAdminKey(c: Context, config: Config): boolean {
  const key = c.req.header("X-Admin-Key");
  return key === config.ADMIN_API_KEY;
}

export function createUserHandler(service: IUserService, config: Config): IUserHandler {
  return {
    register(app: OpenAPIHono) {
      // GET /me
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(getMyProfileRoute, async (c): Promise<any> => {
        const session = getSession(c);
        const result = await service.getMyProfile(session.sub);

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 200);
      });

      // PATCH /me
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(updateMyProfileRoute, async (c): Promise<any> => {
        const session = getSession(c);
        const body = c.req.valid("json");
        const result = await service.updateMyProfile(session.sub, body);

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 200);
      });

      // GET / (list) — TENANT, OWNER
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(listUsersRoute, async (c): Promise<any> => {
        const session = getSession(c);
        if (!hasRole(session, "TENANT", "OWNER")) {
          return respondError(c, { code: "FORBIDDEN", message: "Permissão insuficiente" });
        }

        const query = c.req.valid("query");
        const result = await service.listUsers(query);

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 200);
      });

      // GET /:id — TENANT, OWNER
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(getUserByIdRoute, async (c): Promise<any> => {
        const session = getSession(c);
        if (!hasRole(session, "TENANT", "OWNER")) {
          return respondError(c, { code: "FORBIDDEN", message: "Permissão insuficiente" });
        }

        const { id } = c.req.valid("param");
        const result = await service.getUserById(id);

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 200);
      });

      // PATCH /:id — OWNER
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(updateUserRoute, async (c): Promise<any> => {
        const session = getSession(c);
        if (!hasRole(session, "OWNER")) {
          return respondError(c, { code: "FORBIDDEN", message: "Permissão insuficiente" });
        }

        const { id } = c.req.valid("param");
        const body = c.req.valid("json");
        const result = await service.updateUser(id, body);

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 200);
      });

      // DELETE /:id — OWNER
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(deleteUserRoute, async (c): Promise<any> => {
        const session = getSession(c);
        if (!hasRole(session, "OWNER")) {
          return respondError(c, { code: "FORBIDDEN", message: "Permissão insuficiente" });
        }

        const { id } = c.req.valid("param");
        const result = await service.deleteUser(id);

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 200);
      });

      // POST /owner — Admin Key
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(createOwnerRoute, async (c): Promise<any> => {
        if (!validateAdminKey(c, config)) {
          return respondError(c, {
            code: "UNAUTHORIZED",
            message: "Admin key ausente ou inválida",
          });
        }

        const body = c.req.valid("json");
        const result = await service.createOwner(body);

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 201);
      });

      // PATCH /owner/:id — Admin Key
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(updateOwnerRoute, async (c): Promise<any> => {
        if (!validateAdminKey(c, config)) {
          return respondError(c, {
            code: "UNAUTHORIZED",
            message: "Admin key ausente ou inválida",
          });
        }

        const { id } = c.req.valid("param");
        const body = c.req.valid("json");
        const result = await service.updateOwner(id, body);

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 200);
      });
    },
  };
}
