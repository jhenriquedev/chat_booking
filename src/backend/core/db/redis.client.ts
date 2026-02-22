/**
 * Client de integracao com Redis.
 *
 * Objetivo:
 * - Encapsular o acesso ao Redis em um unico adapter no core (`IRedisClient` /
 *   `RedisClient`), evitando que modulos de negocio dependam diretamente do driver.
 * - Expor operacoes de cache/chave-valor com retorno padronizado em `Result<T, AppError>`,
 *   alinhado com `src/core/helpers`.
 * - Permitir troca de implementacao ou simulacao (mocks) apenas alterando este arquivo.
 *
 * Regras de projeto:
 * - Interface e implementacao no mesmo arquivo (padrao I<Entidade><Tipo> / <Entidade><Tipo>).
 * - Nao lancar excecoes para fluxo normal: usar sempre `result.Success` / `result.Error`.
 * - Ler configuracoes (connection string) de variaveis de ambiente/ConfigClient quando possivel.
 */

import { createRedisClient } from '../../deps';
import { type AppError, createAppError, type Result, result } from '../helpers/index';
import type { IConfigClient } from '../aws/config/config.client';

export interface RedisClientOptions {
  /**
   * URL de conexao do Redis.
   *
   * Exemplo: "redis://:senha@host:6379/0".
   *
   * - Se nao informada, sera lida de `REDIS_URL` via `ConfigClient`, quando fornecido.
   */
  url?: string;

  /**
   * Client de configuracao centralizada. Quando informado, sera utilizado para
   * resolver `REDIS_URL` de forma lazy (env → SSM/Secrets).
   */
  configClient?: IConfigClient;
}

export interface SetStringOptions {
  /**
   * Tempo de expiracao em segundos. Quando informado, aplica TTL na chave.
   */
  ttlSeconds?: number;
}

export interface IRedisClient {
  /**
   * Recupera o valor de uma chave como string.
   *
   * - Retorna `null` quando a chave nao existe.
   */
  getString(key: string): Promise<Result<string | null, AppError>>;

  /**
   * Define o valor de uma chave como string.
   *
   * - Quando `ttlSeconds` for informado, aplica expiracao na chave.
   */
  setString(
    key: string,
    value: string,
    options?: SetStringOptions,
  ): Promise<Result<void, AppError>>;

  /**
   * Remove uma ou mais chaves.
   *
   * Retorna a quantidade de chaves removidas.
   */
  deleteKeys(keys: string[]): Promise<Result<number, AppError>>;

  /**
   * Verifica se uma chave existe.
   */
  exists(key: string): Promise<Result<boolean, AppError>>;

  /**
   * Incrementa o valor numerico armazenado em uma chave.
   *
   * - Se a chave nao existir, e criada com valor inicial 0 antes do incremento.
   */
  increment(key: string, by?: number): Promise<Result<number, AppError>>;

  /**
   * Incrementa o valor numerico armazenado em uma chave e aplica expiracao.
   *
   * - A expiracao e aplicada em segundos e pode ser reutilizada para janelas de tempo.
   * - Retorna o novo valor incrementado.
   */
  incrementWithExpire(
    key: string,
    by: number,
    ttlSeconds: number,
  ): Promise<Result<number, AppError>>;

  /**
   * Recupera um valor armazenado como JSON e o converte para `T`.
   *
   * - Retorna `null` quando a chave nao existe.
   */
  getJson<T = unknown>(key: string): Promise<Result<T | null, AppError>>;

  /**
   * Serializa um objeto como JSON e armazena na chave.
   *
   * - Quando `ttlSeconds` for informado, aplica expiracao na chave.
   */
  setJson<T = unknown>(
    key: string,
    value: T,
    options?: SetStringOptions,
  ): Promise<Result<void, AppError>>;

  /**
   * Encerra a conexao com o Redis.
   *
   * Em ambiente serverless, esta chamada e opcional, mas pode ser utilizada
   * em scripts/batches.
   */
  close(): Promise<Result<void, AppError>>;
}

export class RedisClient implements IRedisClient {
  private client: ReturnType<typeof createRedisClient> | null = null;
  private connected = false;

  private url?: string;
  private readonly configClient?: IConfigClient;

  /**
   * Cria uma nova instancia de `RedisClient`.
   *
   * - `url`: se nao informada, e lida de `REDIS_URL` via `ConfigClient`, quando fornecido.
   * - Se nenhuma URL for encontrada, as operacoes retornarao `AppError` apropriado.
   */
  constructor(options: RedisClientOptions = {}) {
    this.url = options.url;
    this.configClient = options.configClient;
  }

  async getString(key: string): Promise<Result<string | null, AppError>> {
    const ensure = await this.ensureConnected();
    const handledEnsure = result.from(ensure);
    if (handledEnsure.isError()) {
      return result.Error<string | null, AppError>(handledEnsure.ErrorValue()).unwrap();
    }

    try {
      const value = await (this.client as any).get(key);
      return result.Success<string | null, AppError>(value).unwrap();
    } catch (error) {
      return result
        .Error<string | null, AppError>(
          createAppError('REDIS_GET_FAILED', 'Falha ao obter valor do Redis', {
            cause: error,
            details: { key },
          }),
        )
        .unwrap();
    }
  }

  async setString(
    key: string,
    value: string,
    options: SetStringOptions = {},
  ): Promise<Result<void, AppError>> {
    const ensure = await this.ensureConnected();
    const handledEnsure = result.from(ensure);
    if (handledEnsure.isError()) {
      return result.Error<void, AppError>(handledEnsure.ErrorValue()).unwrap();
    }

    try {
      const args: any[] = [key, value];
      if (typeof options.ttlSeconds === 'number' && options.ttlSeconds > 0) {
        args.push({
          EX: options.ttlSeconds,
        } as never);
      }

      await (this.client as any).set(...args);
      return result.Success<void, AppError>(undefined).unwrap();
    } catch (error) {
      return result
        .Error<void, AppError>(
          createAppError('REDIS_SET_FAILED', 'Falha ao definir valor no Redis', {
            cause: error,
            details: { key },
          }),
        )
        .unwrap();
    }
  }

  async deleteKeys(keys: string[]): Promise<Result<number, AppError>> {
    const ensure = await this.ensureConnected();
    const handledEnsure = result.from(ensure);
    if (handledEnsure.isError()) {
      return result.Error<number, AppError>(handledEnsure.ErrorValue()).unwrap();
    }

    if (keys.length === 0) {
      return result.Success<number, AppError>(0).unwrap();
    }

    try {
      const deleted = await (this.client as any).del(keys);
      return result.Success<number, AppError>(deleted).unwrap();
    } catch (error) {
      return result
        .Error<number, AppError>(
          createAppError('REDIS_DEL_FAILED', 'Falha ao remover chaves no Redis', {
            cause: error,
            details: { keys },
          }),
        )
        .unwrap();
    }
  }

  async exists(key: string): Promise<Result<boolean, AppError>> {
    const ensure = await this.ensureConnected();
    const handledEnsure = result.from(ensure);
    if (handledEnsure.isError()) {
      return result.Error<boolean, AppError>(handledEnsure.ErrorValue()).unwrap();
    }

    try {
      const count = await (this.client as any).exists(key);
      return result.Success<boolean, AppError>(count === 1).unwrap();
    } catch (error) {
      return result
        .Error<boolean, AppError>(
          createAppError(
            'REDIS_EXISTS_FAILED',
            'Falha ao verificar existencia de chave no Redis',
            {
              cause: error,
              details: { key },
            },
          ),
        )
        .unwrap();
    }
  }

  async increment(key: string, by = 1): Promise<Result<number, AppError>> {
    const ensure = await this.ensureConnected();
    const handledEnsure = result.from(ensure);
    if (handledEnsure.isError()) {
      return result.Error<number, AppError>(handledEnsure.ErrorValue()).unwrap();
    }

    try {
      const newValue =
        by === 1
          ? await (this.client as any).incr(key)
          : await (this.client as any).incrBy(key, by);

      return result.Success<number, AppError>(newValue).unwrap();
    } catch (error) {
      return result
        .Error<number, AppError>(
          createAppError('REDIS_INCR_FAILED', 'Falha ao incrementar valor no Redis', {
            cause: error,
            details: { key, by },
          }),
        )
        .unwrap();
    }
  }

  async incrementWithExpire(
    key: string,
    by: number,
    ttlSeconds: number,
  ): Promise<Result<number, AppError>> {
    const ensure = await this.ensureConnected();
    const handledEnsure = result.from(ensure);
    if (handledEnsure.isError()) {
      return result.Error<number, AppError>(handledEnsure.ErrorValue()).unwrap();
    }

    try {
      const multi = (this.client as any).multi();
      if (by === 1) {
        multi.incr(key);
      } else {
        multi.incrBy(key, by);
      }
      if (typeof ttlSeconds === 'number' && ttlSeconds > 0) {
        multi.expire(key, ttlSeconds);
      }

      const results = await multi.exec();
      const newValue = Array.isArray(results) ? results[0] : undefined;

      if (typeof newValue !== 'number') {
        return result
          .Error<number, AppError>(
            createAppError(
              'REDIS_INCR_EXPIRE_FAILED',
              'Falha ao incrementar valor com expiracao no Redis',
              { details: { key, by, ttlSeconds, results } },
            ),
          )
          .unwrap();
      }

      return result.Success<number, AppError>(newValue).unwrap();
    } catch (error) {
      return result
        .Error<number, AppError>(
          createAppError(
            'REDIS_INCR_EXPIRE_FAILED',
            'Falha ao incrementar valor com expiracao no Redis',
            {
              cause: error,
              details: { key, by, ttlSeconds },
            },
          ),
        )
        .unwrap();
    }
  }

  async getJson<T = unknown>(key: string): Promise<Result<T | null, AppError>> {
    const strOutcome = await this.getString(key);
    const handled = result.from(strOutcome);
    if (handled.isError()) {
      return result.Error<T | null, AppError>(handled.ErrorValue()).unwrap();
    }

    const raw = handled.SuccessValue();
    if (raw == null) {
      return result.Success<T | null, AppError>(null).unwrap();
    }

    try {
      const parsed = JSON.parse(raw) as T;
      return result.Success<T | null, AppError>(parsed).unwrap();
    } catch (error) {
      return result
        .Error<T | null, AppError>(
          createAppError(
            'REDIS_JSON_PARSE_FAILED',
            'Falha ao fazer parse JSON de valor armazenado no Redis',
            {
              cause: error,
              details: { key },
            },
          ),
        )
        .unwrap();
    }
  }

  async setJson<T = unknown>(
    key: string,
    value: T,
    options: SetStringOptions = {},
  ): Promise<Result<void, AppError>> {
    try {
      const serialized = JSON.stringify(value);
      return await this.setString(key, serialized, options);
    } catch (error) {
      return result
        .Error<void, AppError>(
          createAppError(
            'REDIS_JSON_STRINGIFY_FAILED',
            'Falha ao serializar valor como JSON para o Redis',
            {
              cause: error,
              details: { key },
            },
          ),
        )
        .unwrap();
    }
  }

  async close(): Promise<Result<void, AppError>> {
    if (!this.connected || !this.client) {
      return result.Success<void, AppError>(undefined).unwrap();
    }

    try {
      await this.client.quit();
      this.connected = false;
      this.client = null;
      return result.Success<void, AppError>(undefined).unwrap();
    } catch (error) {
      return result
        .Error<void, AppError>(
          createAppError('REDIS_CLOSE_FAILED', 'Falha ao encerrar conexao com o Redis', {
            cause: error,
          }),
        )
        .unwrap();
    }
  }

  /**
   * Garante que o client esteja conectado antes de executar qualquer comando.
   * Retorna `Result<void, AppError>` permitindo propagacao padronizada de erro.
   */
  private async ensureConnected(): Promise<Result<void, AppError>> {
    if (this.connected && this.client) {
      return result.Success<void, AppError>(undefined).unwrap();
    }

    const connOutcome = await this.resolveConnectionUrl();
    const connHandled = result.from(connOutcome);
    if (connHandled.isError()) {
      return result.Error<void, AppError>(connHandled.ErrorValue()).unwrap();
    }

    const url = connHandled.SuccessValue();

    try {
      const client = createRedisClient({
        url,
      });

      client.on('error', (err: unknown) => {
        // Evita que erros sejam emitidos como eventos nao tratados,
        // mas nao altera o fluxo do caller (erros relevantes
        // sao propagados pelos metodos de operacao).
        console.warn('Redis client error', err);
      });

      await client.connect();

      this.client = client;
      this.connected = true;

      return result.Success<void, AppError>(undefined).unwrap();
    } catch (error) {
      return result
        .Error<void, AppError>(
          createAppError('REDIS_CONNECT_FAILED', 'Falha ao conectar ao Redis', {
            cause: error,
          }),
        )
        .unwrap();
    }
  }

  /**
   * Resolve de forma lazy a URL de conexao:
   * - Se foi definida nas options, reutiliza esse valor;
   * - Se existir `configClient`, tenta `REDIS_URL` (env → SSM/Secrets);
   * - Caso contrario, se nao houver valor, retorna erro `REDIS_CONNECTION_STRING_MISSING`.
   */
  private async resolveConnectionUrl(): Promise<Result<string, AppError>> {
    if (this.url && this.url.length > 0) {
      return result.Success<string, AppError>(this.url).unwrap();
    }

    if (this.configClient) {
      const outcome = await this.configClient.getOptionalString('REDIS_URL');
      const handled = result.from(outcome);
      if (handled.isError()) {
        return result.Error<string, AppError>(handled.ErrorValue()).unwrap();
      }
      const fromConfig = handled.SuccessValue();
      if (fromConfig && fromConfig.length > 0) {
        this.url = fromConfig;
        return result.Success<string, AppError>(fromConfig).unwrap();
      }
    }

    return result
      .Error<
        string,
        AppError
      >(createAppError('REDIS_CONNECTION_STRING_MISSING', 'URL de conexao do Redis nao configurada (REDIS_URL)'))
      .unwrap();
  }
}
