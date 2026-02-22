import { createMiddleware } from "hono/factory";

type RateLimitConfig = {
  /** Janela de tempo em ms (ex: 60_000 = 1 minuto) */
  windowMs: number;
  /** Máximo de requisições por janela */
  maxRequests: number;
};

type Entry = { count: number; resetAt: number };

/**
 * Middleware de rate limiting in-memory com fixed window.
 *
 * Usa o IP do cliente como chave. Headers padrão de rate limit são incluídos
 * na resposta (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset).
 *
 * Retorna 429 quando o limite é excedido.
 *
 * Uso:
 * ```ts
 * app.use("/api/auth/login", rateLimiter({ windowMs: 60_000, maxRequests: 5 }));
 * ```
 */
export function rateLimiter({ windowMs, maxRequests }: RateLimitConfig) {
  const store = new Map<string, Entry>();

  // Cleanup periódico para evitar memory leak
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }, windowMs);

  // Permite garbage collection do timer quando o processo encerrar
  if (cleanup.unref) cleanup.unref();

  return createMiddleware(async (c, next) => {
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      c.req.header("x-real-ip") ??
      "unknown";

    const now = Date.now();
    let entry = store.get(ip);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(ip, entry);
    }

    entry.count++;

    c.header("X-RateLimit-Limit", String(maxRequests));
    c.header("X-RateLimit-Remaining", String(Math.max(0, maxRequests - entry.count)));
    c.header("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > maxRequests) {
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
