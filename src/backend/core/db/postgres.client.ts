/**
 * Client de integracao com PostgreSQL.
 *
 * Objetivo:
 * - Encapsular o acesso ao banco Postgres em um unico adapter no core (`IPostgresClient` /
 *   `PostgresClient`), evitando que modulos de negocio dependam diretamente do driver.
 * - Expor operacoes de consulta/execucao com retorno padronizado em `Result<T, AppError>`,
 *   alinhado com `src/core/helpers`.
 * - Permitir troca de implementacao ou simulacao (mocks) apenas alterando este arquivo.
 *
 * Regras de projeto:
 * - Interface e implementacao no mesmo arquivo (padrao I<Entidade><Tipo> / <Entidade><Tipo>).
 * - Nao lancar excecoes para fluxo normal: usar sempre `result.Success` / `result.Error`.
 * - Ler configuracoes (connection string) de variaveis de ambiente quando possivel.
 */

import { PgClient } from '../../deps';
import { type AppError, createAppError, type Result, result } from '../helpers/index';
import type { IConfigClient } from '../aws/config/config.client';

export interface PostgresClientOptions {
  /**
   * Connection string do banco Postgres.
   * Se nao informado, sera lido de `POSTGRES_URL` ou `DATABASE_URL`
   * (via env ou `ConfigClient`, quando fornecido).
   */
  connectionString?: string;
  /**
   * Client de configuracao centralizada. Quando informado, sera utilizado para
   * resolver `POSTGRES_URL` / `DATABASE_URL` de forma lazy (env → SSM/Secrets).
   */
  configClient?: IConfigClient;
}

export interface IPostgresClient {
  /**
   * Executa uma consulta SQL e retorna linhas tipadas como `T`.
   *
   * Objetivo:
   * - Ser a operacao principal usada pelos repositórios para buscar dados.
   *
   * Uso:
   * ```ts
   * const client = new PostgresClient();
   * const outcome = await client.query<{ id: string }>(
   *   "SELECT id FROM products WHERE id = $1",
   *   ["123"],
   * );
   * if (outcome.ok) {
   *   const rows = outcome.value;
   * }
   * ```
   */
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<Result<T[], AppError>>;

  /**
   * Executa um comando SQL que nao precisa retornar linhas (ex.: INSERT/UPDATE/DELETE simples).
   */
  execute(sql: string, params?: unknown[]): Promise<Result<void, AppError>>;

  /**
   * Encerra a conexao com o banco.
   *
   * Em ambiente serverless, esta chamada e opcional, mas pode ser utilizada em scripts/batches.
   */
  close(): Promise<Result<void, AppError>>;
}

export class PostgresClient implements IPostgresClient {
  private client: InstanceType<typeof PgClient> | null;
  private connectionString?: string;
  private connected = false;
  private readonly configClient?: IConfigClient;

  /**
   * Cria uma nova instancia de `PostgresClient`.
   *
   * - `connectionString`: se nao informada, e lida de `POSTGRES_URL` ou `DATABASE_URL`.
   * - Se nenhuma connection string for encontrada, as operacoes retornarao `AppError` apropriado.
   */
  constructor(options: PostgresClientOptions = {}) {
    this.connectionString = options.connectionString;
    this.configClient = options.configClient;
    this.client = null;
  }

  async query<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<Result<T[], AppError>> {
    const ensure = await this.ensureConnected();
    const handledEnsure = result.from(ensure);
    if (handledEnsure.isError()) {
      return result.Error<T[], AppError>(handledEnsure.ErrorValue()).unwrap();
    }

    try {
      const res = await (this.client as InstanceType<typeof PgClient>).query(sql, params);
      return result.Success<T[], AppError>(res.rows as T[]).unwrap();
    } catch (error) {
      return result
        .Error<T[], AppError>(
          createAppError('POSTGRES_QUERY_FAILED', 'Falha ao executar consulta', {
            cause: error,
            details: {
              sql,
            },
          }),
        )
        .unwrap();
    }
  }

  async execute(sql: string, params: unknown[] = []): Promise<Result<void, AppError>> {
    const ensure = await this.ensureConnected();
    const handledEnsure = result.from(ensure);
    if (handledEnsure.isError()) {
      return handledEnsure.unwrap();
    }

    try {
      await (this.client as InstanceType<typeof PgClient>).query(sql, params);
      return result.Success<void, AppError>(undefined).unwrap();
    } catch (error) {
      return result
        .Error<void, AppError>(
          createAppError('POSTGRES_EXECUTE_FAILED', 'Falha ao executar comando no banco', {
            cause: error,
            details: {
              sql,
            },
          }),
        )
        .unwrap();
    }
  }

  async close(): Promise<Result<void, AppError>> {
    if (!this.connected || !this.client) {
      return result.Success<void, AppError>(undefined).unwrap();
    }

    try {
      await this.client.end();
      this.connected = false;
      this.client = null;
      return result.Success<void, AppError>(undefined).unwrap();
    } catch (error) {
      return result
        .Error<void, AppError>(
          createAppError('POSTGRES_CLOSE_FAILED', 'Falha ao encerrar conexao com o banco', {
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

    const connOutcome = await this.resolveConnectionString();
    const connHandled = result.from(connOutcome);
    if (connHandled.isError()) {
      return result.Error<void, AppError>(connHandled.ErrorValue()).unwrap();
    }

    const connectionString = connHandled.SuccessValue();

    try {
      /**
       * Permite desabilitar a validacao de certificado TLS em ambiente
       * de desenvolvimento quando o banco exige SSL mas utiliza um
       * certificado autoassinado (cenário comum em RDS acessado a
       * partir da máquina local).
       *
       * Convencao:
       * - Quando `PGSSLMODE=no-verify`, criamos o client com
       *   `ssl.rejectUnauthorized = false`, evitando erros
       *   `SELF_SIGNED_CERT_IN_CHAIN`.
       * - Em qualquer outro valor (ou ausente), mantemos o
       *   comportamento padrao do driver.
       */
      const sslOptions =
        process.env.PGSSLMODE === 'no-verify'
          ? { ssl: { rejectUnauthorized: false } as const }
          : {};

      this.client = new PgClient({
        connectionString,
        ...sslOptions,
      });
      await this.client.connect();
      this.connected = true;
      return result.Success<void, AppError>(undefined).unwrap();
    } catch (error) {
      return result
        .Error<void, AppError>(
          createAppError('POSTGRES_CONNECT_FAILED', 'Falha ao conectar ao Postgres', {
            cause: error,
          }),
        )
        .unwrap();
    }
  }

  /**
   * Resolve de forma lazy a connection string:
   * - Se foi definida nas options, reutiliza esse valor;
   * - Se existir `configClient`, tenta `POSTGRES_URL` e depois `DATABASE_URL` (env → SSM/Secrets);
   * - Caso contrario, se nao houver valor, retorna erro `POSTGRES_CONNECTION_STRING_MISSING`.
   */
  private async resolveConnectionString(): Promise<Result<string, AppError>> {
    if (this.connectionString && this.connectionString.length > 0) {
      return result.Success<string, AppError>(this.connectionString).unwrap();
    }

    if (this.configClient) {
      const primary = await this.configClient.getOptionalString('POSTGRES_URL');
      const primaryHandled = result.from(primary);
      if (primaryHandled.isError()) {
        return result.Error<string, AppError>(primaryHandled.ErrorValue()).unwrap();
      }
      const fromPrimary = primaryHandled.SuccessValue();
      if (fromPrimary && fromPrimary.length > 0) {
        this.connectionString = fromPrimary;
        return result.Success<string, AppError>(fromPrimary).unwrap();
      }

      const secondary = await this.configClient.getOptionalString('DATABASE_URL');
      const secondaryHandled = result.from(secondary);
      if (secondaryHandled.isError()) {
        return result.Error<string, AppError>(secondaryHandled.ErrorValue()).unwrap();
      }
      const fromSecondary = secondaryHandled.SuccessValue();
      if (fromSecondary && fromSecondary.length > 0) {
        this.connectionString = fromSecondary;
        return result.Success<string, AppError>(fromSecondary).unwrap();
      }
    }

    return result
      .Error<
        string,
        AppError
      >(createAppError('POSTGRES_CONNECTION_STRING_MISSING', 'Connection string do Postgres nao configurada (POSTGRES_URL / DATABASE_URL)'))
      .unwrap();
  }
}
