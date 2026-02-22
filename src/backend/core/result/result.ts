/**
 * Result pattern para padronizar retornos em todas as camadas.
 *
 * Uso:
 * ```ts
 * // Sucesso
 * return Result.ok(user);
 *
 * // Erro
 * return Result.fail({ code: "USER_NOT_FOUND", message: "Usuário não encontrado" });
 *
 * // Consumindo
 * const result = await userService.findById(id);
 * if (result.isErr()) {
 *   return c.json({ error: result.error }, 400);
 * }
 * const user = result.value;
 * ```
 */

export type AppError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

type Ok<T> = {
  readonly ok: true;
  readonly value: T;
  readonly error: null;
  isOk(): this is Ok<T>;
  isErr(): this is Err;
};

type Err = {
  readonly ok: false;
  readonly value: null;
  readonly error: AppError;
  isOk(): this is Ok<never>;
  isErr(): this is Err;
};

export type Result<T> = Ok<T> | Err;

export const Result = {
  ok<T>(value: T): Result<T> {
    return {
      ok: true,
      value,
      error: null,
      isOk: () => true,
      isErr: () => false,
    } as Ok<T>;
  },

  fail<T = never>(error: AppError): Result<T> {
    return {
      ok: false,
      value: null,
      error,
      isOk: () => false,
      isErr: () => true,
    } as Err as Result<T>;
  },

  /**
   * Wrapa uma Promise que pode lançar exceção em um Result.
   *
   * ```ts
   * const result = await Result.fromAsync(async () => {
   *   return await db.select().from(users).where(eq(users.id, id));
   * }, "DB_QUERY_FAILED");
   * ```
   */
  async fromAsync<T>(
    fn: () => Promise<T>,
    errorCode = "UNEXPECTED_ERROR",
  ): Promise<Result<T>> {
    try {
      const value = await fn();
      return Result.ok(value);
    } catch (err) {
      return Result.fail({
        code: errorCode,
        message: err instanceof Error ? err.message : String(err),
        details: { original: err },
      });
    }
  },
};
