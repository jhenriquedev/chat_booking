import { createMiddleware } from "hono/factory";
import type { Redis } from "ioredis";

type RateLimitConfig = {
  /** Instância do Redis para armazenar contadores */
  redis: Redis;
  /** Prefixo da chave no Redis (ex: "login", "refresh") */
  prefix: string;
  /** Janela de tempo em ms (ex: 60_000 = 1 minuto) */
  windowMs: number;
  /** Máximo de requisições por janela */
  maxRequests: number;
};

/**
 * Middleware de rate limiting com Redis (fixed window).
 *
 * Usa o IP do cliente como chave. Headers padrão de rate limit são incluídos
 * na resposta (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset).
 *
 * Retorna 429 quando o limite é excedido.
 *
 * Uso:
 * ```ts
 * app.use("/api/auth/login", rateLimiter({ redis, prefix: "login", windowMs: 60_000, maxRequests: 5 }));
 * ```
 */
export function rateLimiter({ redis, prefix, windowMs, maxRequests }: RateLimitConfig) {
  const ttlSeconds = Math.ceil(windowMs / 1000);

  /** INCR + EXPIRE atômico via Lua — elimina race condition entre os dois comandos */
  const luaScript = `
    local count = redis.call('INCR', KEYS[1])
    if count == 1 then
      redis.call('EXPIRE', KEYS[1], ARGV[1])
    end
    return count
  `;

  return createMiddleware(async (c, next) => {
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      c.req.header("x-real-ip") ??
      "unknown";

    const key = `rl:${prefix}:${ip}`;

    const count = (await redis.eval(luaScript, 1, key, ttlSeconds)) as number;
    const ttl = await redis.ttl(key);
    const resetAt = Math.ceil(Date.now() / 1000) + Math.max(ttl, 0);

    c.header("X-RateLimit-Limit", String(maxRequests));
    c.header("X-RateLimit-Remaining", String(Math.max(0, maxRequests - count)));
    c.header("X-RateLimit-Reset", String(resetAt));

    if (count > maxRequests) {
      return c.json(
        {
          error: { code: "RATE_LIMITED", message: "Muitas requisições. Tente novamente em breve." },
        },
        429,
      );
    }

    await next();
  });
}
