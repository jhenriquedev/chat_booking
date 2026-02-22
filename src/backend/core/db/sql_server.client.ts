/**
 * Client de integracao com SQL Server.
 *
 * Objetivo:
 * - Encapsular o acesso ao SQL Server em um unico adapter no core (`ISqlServerClient` /
 *   `SqlServerClient`), evitando que modulos de negocio dependam diretamente do driver `mssql`.
 * - Expor operacoes de consulta/execucao com retorno padronizado em `Result<T, AppError>`,
 *   alinhado com `src/core/helpers`.
 * - Permitir troca de implementacao ou simulacao (mocks) apenas alterando este arquivo.
 *
 * Regras de projeto:
 * - Interface e implementacao no mesmo arquivo (padrao I<Entidade><Tipo> / <Entidade><Tipo>).
 * - Nao lancar excecoes para fluxo normal: usar sempre `result.Success` / `result.Error`.
 * - Ler configuracoes (connection string / host/usuario/senha) de variaveis de ambiente quando possivel.
 */

import { mssql } from '../../deps';
import { type AppError, createAppError, type Result, result } from '../helpers/index';
import type { IConfigClient } from '../aws/config/config.client';

export interface SqlServerClientOptions {
  /**
   * Connection string do SQL Server.
   * Se nao informado, sera lido de `SQLSERVER_URL` via `ConfigClient`, quando fornecido.
   */
  connectionString?: string;
  /**
   * Client de configuracao centralizada. Quando informado, sera utilizado para
   * resolver `SQLSERVER_URL` de forma lazy (env → SSM/Secrets).
   */
  configClient?: IConfigClient;
}

export interface ISqlServerClient {
  /**
   * Executa uma consulta SQL e retorna linhas tipadas como `T`.
   *
   * Objetivo:
   * - Ser a operacao principal usada pelos repositórios para buscar dados.
   *
   * Uso:
   * ```ts
   * const client = new SqlServerClient();
   * const outcome = await client.query<{ id: string }>(
   *   "SELECT id FROM products WHERE id = @p1",
   *   ["123"],
   * );
   * if (outcome.ok) {
   *   const rows = outcome.value;
   * }
   * ```
   *
   * Importante: os parametros sao mapeados como `@p1`, `@p2`, ... na query.
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

type SqlPool = {
  request: () => {
    input: (name: string, value: unknown) => unknown;
    query: <T = unknown>(sql: string) => Promise<{ recordset: T[] }>;
  };
  close: () => Promise<void>;
};

export class SqlServerClient implements ISqlServerClient {
  private pool: SqlPool | null = null;
  private connectionString?: string;
  private readonly configClient?: IConfigClient;

  /**
   * Cria uma nova instancia de `SqlServerClient`.
   *
   * - `connectionString`: se nao informada, e lida de `SQLSERVER_URL` via `ConfigClient`, quando fornecido.
   * - Se nenhuma connection string for encontrada, as operacoes retornarao `AppError` apropriado.
   */
  constructor(options: SqlServerClientOptions = {}) {
    this.connectionString = options.connectionString ?? undefined;
    this.configClient = options.configClient;
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
      const pool = this.pool as SqlPool;
      const request = pool.request();
      params.forEach((value, index) => {
        request.input(`p${index + 1}`, value);
      });
      const res = await request.query<T>(sql);
      return result.Success<T[], AppError>(res.recordset).unwrap();
    } catch (error) {
      return result
        .Error<T[], AppError>(
          createAppError('SQLSERVER_QUERY_FAILED', 'Falha ao executar consulta no SQL Server', {
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
      const pool = this.pool as SqlPool;
      const request = pool.request();
      params.forEach((value, index) => {
        request.input(`p${index + 1}`, value);
      });
      await request.query(sql);
      return result.Success<void, AppError>(undefined).unwrap();
    } catch (error) {
      return result
        .Error<void, AppError>(
          createAppError('SQLSERVER_EXECUTE_FAILED', 'Falha ao executar comando no SQL Server', {
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
    if (!this.pool) {
      return result.Success<void, AppError>(undefined).unwrap();
    }

    try {
      await this.pool.close();
      this.pool = null;
      return result.Success<void, AppError>(undefined).unwrap();
    } catch (error) {
      return result
        .Error<void, AppError>(
          createAppError(
            'SQLSERVER_CLOSE_FAILED',
            'Falha ao encerrar conexao com o SQL Server',
            {
              cause: error,
            },
          ),
        )
        .unwrap();
    }
  }

  /**
   * Garante que o pool esteja conectado antes de executar qualquer comando.
   * Retorna `Result<void, AppError>` permitindo propagacao padronizada de erro.
   */
  private async ensureConnected(): Promise<Result<void, AppError>> {
    if (this.pool) {
      return result.Success<void, AppError>(undefined).unwrap();
    }

    const connOutcome = await this.resolveConnectionString();
    const connHandled = result.from(connOutcome);
    if (connHandled.isError()) {
      return result.Error<void, AppError>(connHandled.ErrorValue()).unwrap();
    }

    const connectionString = connHandled.SuccessValue();

    try {
      const pool = await mssql.connect(connectionString);
      this.pool = pool as SqlPool;
      return result.Success<void, AppError>(undefined).unwrap();
    } catch (error) {
      return result
        .Error<void, AppError>(
          createAppError('SQLSERVER_CONNECT_FAILED', 'Falha ao conectar ao SQL Server', {
            cause: error,
          }),
        )
        .unwrap();
    }
  }

  /**
   * Resolve de forma lazy a connection string:
   * - Se foi definida nas options, reutiliza esse valor;
   * - Se existir `configClient`, tenta `SQLSERVER_URL` (env → SSM/Secrets);
   * - Se ainda assim nao houver valor, retorna erro `SQLSERVER_CONNECTION_STRING_MISSING`.
   */
  private async resolveConnectionString(): Promise<Result<string, AppError>> {
    if (this.connectionString && this.connectionString.length > 0) {
      return result.Success<string, AppError>(this.connectionString).unwrap();
    }

    if (this.configClient) {
      const outcome = await this.configClient.getOptionalString('SQLSERVER_URL');
      const handled = result.from(outcome);
      if (handled.isError()) {
        return result.Error<string, AppError>(handled.ErrorValue()).unwrap();
      }
      const fromConfig = handled.SuccessValue();
      if (fromConfig && fromConfig.length > 0) {
        this.connectionString = fromConfig;
        return result.Success<string, AppError>(fromConfig).unwrap();
      }
    }

    return result
      .Error<
        string,
        AppError
      >(createAppError('SQLSERVER_CONNECTION_STRING_MISSING', 'Connection string do SQL Server nao configurada (SQLSERVER_URL)'))
      .unwrap();
  }
}
