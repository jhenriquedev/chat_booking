import type { OpenAPIHono } from "@hono/zod-openapi";
import { respondError } from "../../core/error/error.handler.js";
import { getSession } from "../../core/session/session.guard.js";
import { loginRoute, logoutRoute, refreshRoute } from "./2_api.js";
import type { IAuthService } from "./4_service.js";

export interface IAuthHandler {
  register(app: OpenAPIHono): void;
}

export function createAuthHandler(service: IAuthService): IAuthHandler {
  return {
    register(app: OpenAPIHono) {
      // POST /login (público)
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(loginRoute, async (c): Promise<any> => {
        const body = c.req.valid("json");
        const result = await service.login(body);

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 200);
      });

      // POST /refresh (público)
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(refreshRoute, async (c): Promise<any> => {
        const body = c.req.valid("json");
        const result = await service.refresh(body.refreshToken);

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 200);
      });

      // POST /logout (protegido — sessionGuard já validou JWT)
      // biome-ignore lint/suspicious/noExplicitAny: respondError retorna status genérico incompatível com zod-openapi typed routes
      app.openapi(logoutRoute, async (c): Promise<any> => {
        const session = getSession(c);
        const result = await service.logout(session.sub);

        if (result.isErr()) return respondError(c, result.error);
        return c.json(result.value, 200);
      });
    },
  };
}
