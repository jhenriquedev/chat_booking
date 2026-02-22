/**
 * Client de integracao com MongoDB.
 *
 * Objetivo:
 * - Encapsular o acesso ao MongoDB em um unico adapter no core (`IMongoClient` /
 *   `MongoClient`), evitando que modulos de negocio dependam diretamente do driver.
 * - Expor operacoes de leitura/escrita com retorno padronizado em `Result<T, AppError>`,
 *   alinhado com `src/core/helpers`.
 * - Permitir troca de implementacao ou simulacao (mocks) apenas alterando este arquivo.
 *
 * Regras de projeto:
 * - Interface e implementacao no mesmo arquivo (padrao I<Entidade><Tipo> / <Entidade><Tipo>).
 * - Nao lancar excecoes para fluxo normal: usar sempre `result.Success` / `result.Error`.
 * - Ler configuracoes (connection string / nome do banco) via `ConfigClient` quando possivel.
 */

import type { Document } from 'mongodb';
import { NativeMongoClient } from '../../deps';
import { type AppError, createAppError, type Result, result } from '../helpers/index';
import type { IConfigClient } from '../aws/config/config.client';

export interface MongoClientOptions {
  /**
   * Connection string do MongoDB (ex.: "mongodb://user:pass@host:27017").
   *
   * - Se nao informada, sera lida de `MONGO_URL` via `ConfigClient`, quando fornecido.
   */
  uri?: string;

  /**
   * Nome do database padrao.
   *
   * - Se nao informado, sera lido de `MONGO_DB_NAME` via `ConfigClient`, quando fornecido.
   */
  dbName?: string;

  /**
   * Client de configuracao centralizada. Quando informado, sera utilizado para
   * resolver `MONGO_URL` e `MONGO_DB_NAME` de forma lazy (env → SSM/Secrets).
   */
  configClient?: IConfigClient;
}

export interface FindManyOptions {
  limit?: number;
  skip?: number;
  sort?: Record<string, 1 | -1>;
  projection?: Record<string, 0 | 1 | boolean>;
}

export interface UpdateResult {
  matchedCount: number;
  modifiedCount: number;
  upsertedId?: string;
}

export interface IMongoClient {
  /**
   * Recupera um documento unico a partir de um filtro.
   */
  findOne<T = Record<string, unknown>>(
    collection: string,
    filter: Record<string, unknown>,
    options?: { projection?: Record<string, 0 | 1 | boolean> },
  ): Promise<Result<T | null, AppError>>;

  /**
   * Recupera multiplos documentos a partir de um filtro com opcoes basicas
   * de paginacao/ordenacao.
   */
  findMany<T = Record<string, unknown>>(
    collection: string,
    filter: Record<string, unknown>,
    options?: FindManyOptions,
  ): Promise<Result<T[], AppError>>;

  /**
   * Conta documentos que atendem ao filtro informado.
   */
  countDocuments(
    collection: string,
    filter: Record<string, unknown>,
  ): Promise<Result<number, AppError>>;

  /**
   * Insere um unico documento na colecao.
   *
   * Retorna o `_id` gerado como string, quando disponivel.
   */
  insertOne<T = Record<string, unknown>>(
    collection: string,
    document: T,
  ): Promise<Result<string, AppError>>;

  /**
   * Insere multiplos documentos na colecao.
   *
   * Retorna a lista de `_id` gerados como string, quando disponiveis.
   */
  insertMany<T = Record<string, unknown>>(
    collection: string,
    documents: T[],
  ): Promise<Result<string[], AppError>>;

  /**
   * Atualiza um unico documento que atenda ao filtro, com opcional upsert.
   */
  updateOne(
    collection: string,
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: { upsert?: boolean },
  ): Promise<Result<UpdateResult, AppError>>;

  /**
   * Atualiza todos os documentos que atendam ao filtro.
   */
  updateMany(
    collection: string,
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: { upsert?: boolean },
  ): Promise<Result<UpdateResult, AppError>>;

  /**
   * Remove um unico documento que atenda ao filtro.
   *
   * Retorna a quantidade de documentos removidos (0 ou 1).
   */
  deleteOne(
    collection: string,
    filter: Record<string, unknown>,
  ): Promise<Result<number, AppError>>;

  /**
   * Remove todos os documentos que atendam ao filtro.
   *
   * Retorna a quantidade de documentos removidos.
   */
  deleteMany(
    collection: string,
    filter: Record<string, unknown>,
  ): Promise<Result<number, AppError>>;

  /**
   * Executa um pipeline de agregacao.
   */
  aggregate<T = Record<string, unknown>>(
    collection: string,
    pipeline: unknown[],
  ): Promise<Result<T[], AppError>>;

  /**
   * Encerra a conexao com o MongoDB.
   *
   * Em ambiente serverless, esta chamada e opcional, mas pode ser utilizada
   * em scripts/batches.
   */
  close(): Promise<Result<void, AppError>>;
}

export class MongoClient implements IMongoClient {
  private client: InstanceType<typeof NativeMongoClient> | null = null;
  private db: { collection: (name: string) => unknown } | null = null;
  private connected = false;

  private uri?: string;
  private dbName?: string;
  private readonly configClient?: IConfigClient;

  /**
   * Cria uma nova instancia de `MongoClient`.
   *
   * - `uri`: se nao informada, e lida de `MONGO_URL` via `ConfigClient`, quando fornecido.
   * - `dbName`: se nao informado, e lido de `MONGO_DB_NAME` via `ConfigClient`, quando fornecido.
   * - Se nenhuma connection string for encontrada, as operacoes retornarao `AppError` apropriado.
   */
  constructor(options: MongoClientOptions = {}) {
    this.uri = options.uri;
    this.dbName = options.dbName;
    this.configClient = options.configClient;
  }

  async findOne<T = Record<string, unknown>>(
    collection: string,
    filter: Record<string, unknown>,
    options: { projection?: Record<string, 0 | 1 | boolean> } = {},
  ): Promise<Result<T | null, AppError>> {
    const ensure = await this.ensureConnected();
    const handledEnsure = result.from(ensure);
    if (handledEnsure.isError()) {
      return result.Error<T | null, AppError>(handledEnsure.ErrorValue()).unwrap();
    }

    try {
      const db = this.db as unknown as {
        collection: (name: string) => {
          findOne: (query: Document, opts?: unknown) => Promise<unknown>;
        };
      };

      const doc = await db
        .collection(collection)
        .findOne(
          filter as Document,
          options.projection ? { projection: options.projection } : undefined,
        );

      return result.Success<T | null, AppError>(doc as T | null).unwrap();
    } catch (error) {
      return result
        .Error<T | null, AppError>(
          createAppError('MONGO_FIND_ONE_FAILED', 'Falha ao executar findOne no MongoDB', {
            cause: error,
            details: {
              collection,
            },
          }),
        )
        .unwrap();
    }
  }

  async findMany<T = Record<string, unknown>>(
    collection: string,
    filter: Record<string, unknown>,
    options: FindManyOptions = {},
  ): Promise<Result<T[], AppError>> {
    const ensure = await this.ensureConnected();
    const handledEnsure = result.from(ensure);
    if (handledEnsure.isError()) {
      return result.Error<T[], AppError>(handledEnsure.ErrorValue()).unwrap();
    }

    try {
      const db = this.db as unknown as {
        collection: (name: string) => {
          find: (
            query: Document,
            opts?: unknown,
          ) => {
            skip: (n: number) => unknown;
            limit: (n: number) => unknown;
            sort: (spec: Record<string, 1 | -1>) => unknown;
            toArray: () => Promise<unknown[]>;
          };
        };
      };

      const baseCursor = db
        .collection(collection)
        .find(
          filter as Document,
          options.projection ? { projection: options.projection } : undefined,
        ) as {
        skip: (n: number) => typeof baseCursor;
        limit: (n: number) => typeof baseCursor;
        sort: (spec: Record<string, 1 | -1>) => typeof baseCursor;
        toArray: () => Promise<unknown[]>;
      };

      let cursor = baseCursor;
      if (typeof options.skip === 'number' && options.skip > 0) {
        cursor = cursor.skip(options.skip);
      }
      if (typeof options.limit === 'number' && options.limit > 0) {
        cursor = cursor.limit(options.limit);
      }
      if (options.sort && Object.keys(options.sort).length > 0) {
        cursor = cursor.sort(options.sort);
      }

      const docs = await cursor.toArray();
      return result.Success<T[], AppError>(docs as T[]).unwrap();
    } catch (error) {
      return result
        .Error<T[], AppError>(
          createAppError('MONGO_FIND_MANY_FAILED', 'Falha ao executar findMany no MongoDB', {
            cause: error,
            details: {
              collection,
            },
          }),
        )
        .unwrap();
    }
  }

  async countDocuments(
    collection: string,
    filter: Record<string, unknown>,
  ): Promise<Result<number, AppError>> {
    const ensure = await this.ensureConnected();
    const handledEnsure = result.from(ensure);
    if (handledEnsure.isError()) {
      return result.Error<number, AppError>(handledEnsure.ErrorValue()).unwrap();
    }

    try {
      const db = this.db as unknown as {
        collection: (name: string) => { countDocuments: (query: Document) => Promise<number> };
      };

      const count = await db.collection(collection).countDocuments(filter as Document);
      return result.Success<number, AppError>(count).unwrap();
    } catch (error) {
      return result
        .Error<number, AppError>(
          createAppError('MONGO_COUNT_FAILED', 'Falha ao contar documentos no MongoDB', {
            cause: error,
            details: {
              collection,
            },
          }),
        )
        .unwrap();
    }
  }

  async insertOne<T = Record<string, unknown>>(
    collection: string,
    document: T,
  ): Promise<Result<string, AppError>> {
    const ensure = await this.ensureConnected();
    const handledEnsure = result.from(ensure);
    if (handledEnsure.isError()) {
      return result.Error<string, AppError>(handledEnsure.ErrorValue()).unwrap();
    }

    try {
      const db = this.db as unknown as {
        collection: (name: string) => {
          insertOne: (doc: Document) => Promise<{ insertedId: unknown }>;
        };
      };

      const resultInsert = await db
        .collection(collection)
        .insertOne(document as unknown as Document);
      const id = resultInsert.insertedId != null ? String(resultInsert.insertedId) : '';

      return result.Success<string, AppError>(id).unwrap();
    } catch (error) {
      return result
        .Error<string, AppError>(
          createAppError('MONGO_INSERT_ONE_FAILED', 'Falha ao inserir documento no MongoDB', {
            cause: error,
            details: {
              collection,
            },
          }),
        )
        .unwrap();
    }
  }

  async insertMany<T = Record<string, unknown>>(
    collection: string,
    documents: T[],
  ): Promise<Result<string[], AppError>> {
    const ensure = await this.ensureConnected();
    const handledEnsure = result.from(ensure);
    if (handledEnsure.isError()) {
      return result.Error<string[], AppError>(handledEnsure.ErrorValue()).unwrap();
    }

    try {
      const db = this.db as unknown as {
        collection: (name: string) => {
          insertMany: (docs: Document[]) => Promise<{ insertedIds: Record<string, unknown> }>;
        };
      };

      const resultInsert = await db
        .collection(collection)
        .insertMany(documents as unknown as Document[]);

      const ids = Object.values(resultInsert.insertedIds ?? {}).map((value) => String(value));

      return result.Success<string[], AppError>(ids).unwrap();
    } catch (error) {
      return result
        .Error<string[], AppError>(
          createAppError('MONGO_INSERT_MANY_FAILED', 'Falha ao inserir documentos no MongoDB', {
            cause: error,
            details: {
              collection,
              count: documents.length,
            },
          }),
        )
        .unwrap();
    }
  }

  async updateOne(
    collection: string,
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options: { upsert?: boolean } = {},
  ): Promise<Result<UpdateResult, AppError>> {
    const ensure = await this.ensureConnected();
    const handledEnsure = result.from(ensure);
    if (handledEnsure.isError()) {
      return result.Error<UpdateResult, AppError>(handledEnsure.ErrorValue()).unwrap();
    }

    try {
      const db = this.db as unknown as {
        collection: (name: string) => {
          updateOne: (
            query: Document,
            updateDoc: Document,
            opts?: unknown,
          ) => Promise<{
            matchedCount: number;
            modifiedCount: number;
            upsertedId?: unknown;
          }>;
        };
      };

      const resultUpdate = await db
        .collection(collection)
        .updateOne(
          filter as Document,
          update as Document,
          options.upsert ? { upsert: options.upsert } : undefined,
        );

      const mapped: UpdateResult = {
        matchedCount: resultUpdate.matchedCount,
        modifiedCount: resultUpdate.modifiedCount,
        upsertedId:
          resultUpdate.upsertedId != null ? String(resultUpdate.upsertedId) : undefined,
      };

      return result.Success<UpdateResult, AppError>(mapped).unwrap();
    } catch (error) {
      return result
        .Error<UpdateResult, AppError>(
          createAppError('MONGO_UPDATE_ONE_FAILED', 'Falha ao atualizar documento no MongoDB', {
            cause: error,
            details: {
              collection,
            },
          }),
        )
        .unwrap();
    }
  }

  async updateMany(
    collection: string,
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options: { upsert?: boolean } = {},
  ): Promise<Result<UpdateResult, AppError>> {
    const ensure = await this.ensureConnected();
    const handledEnsure = result.from(ensure);
    if (handledEnsure.isError()) {
      return result.Error<UpdateResult, AppError>(handledEnsure.ErrorValue()).unwrap();
    }

    try {
      const db = this.db as unknown as {
        collection: (name: string) => {
          updateMany: (
            query: Document,
            updateDoc: Document,
            opts?: unknown,
          ) => Promise<{
            matchedCount: number;
            modifiedCount: number;
          }>;
        };
      };

      const resultUpdate = await db
        .collection(collection)
        .updateMany(
          filter as Document,
          update as Document,
          options.upsert ? { upsert: options.upsert } : undefined,
        );

      const mapped: UpdateResult = {
        matchedCount: resultUpdate.matchedCount,
        modifiedCount: resultUpdate.modifiedCount,
      };

      return result.Success<UpdateResult, AppError>(mapped).unwrap();
    } catch (error) {
      return result
        .Error<UpdateResult, AppError>(
          createAppError(
            'MONGO_UPDATE_MANY_FAILED',
            'Falha ao atualizar documentos no MongoDB',
            {
              cause: error,
              details: {
                collection,
              },
            },
          ),
        )
        .unwrap();
    }
  }

  async deleteOne(
    collection: string,
    filter: Record<string, unknown>,
  ): Promise<Result<number, AppError>> {
    const ensure = await this.ensureConnected();
    const handledEnsure = result.from(ensure);
    if (handledEnsure.isError()) {
      return result.Error<number, AppError>(handledEnsure.ErrorValue()).unwrap();
    }

    try {
      const db = this.db as unknown as {
        collection: (name: string) => {
          deleteOne: (query: Document) => Promise<{ deletedCount?: number }>;
        };
      };

      const resultDelete = await db.collection(collection).deleteOne(filter as Document);
      const deleted = resultDelete.deletedCount ?? 0;

      return result.Success<number, AppError>(deleted).unwrap();
    } catch (error) {
      return result
        .Error<number, AppError>(
          createAppError('MONGO_DELETE_ONE_FAILED', 'Falha ao remover documento no MongoDB', {
            cause: error,
            details: {
              collection,
            },
          }),
        )
        .unwrap();
    }
  }

  async deleteMany(
    collection: string,
    filter: Record<string, unknown>,
  ): Promise<Result<number, AppError>> {
    const ensure = await this.ensureConnected();
    const handledEnsure = result.from(ensure);
    if (handledEnsure.isError()) {
      return result.Error<number, AppError>(handledEnsure.ErrorValue()).unwrap();
    }

    try {
      const db = this.db as unknown as {
        collection: (name: string) => {
          deleteMany: (query: Document) => Promise<{ deletedCount?: number }>;
        };
      };

      const resultDelete = await db.collection(collection).deleteMany(filter as Document);
      const deleted = resultDelete.deletedCount ?? 0;

      return result.Success<number, AppError>(deleted).unwrap();
    } catch (error) {
      return result
        .Error<number, AppError>(
          createAppError('MONGO_DELETE_MANY_FAILED', 'Falha ao remover documentos no MongoDB', {
            cause: error,
            details: {
              collection,
            },
          }),
        )
        .unwrap();
    }
  }

  async aggregate<T = Record<string, unknown>>(
    collection: string,
    pipeline: unknown[],
  ): Promise<Result<T[], AppError>> {
    const ensure = await this.ensureConnected();
    const handledEnsure = result.from(ensure);
    if (handledEnsure.isError()) {
      return result.Error<T[], AppError>(handledEnsure.ErrorValue()).unwrap();
    }

    try {
      const db = this.db as unknown as {
        collection: (name: string) => {
          aggregate: (stages: unknown[]) => {
            toArray: () => Promise<unknown[]>;
          };
        };
      };

      const cursor = db.collection(collection).aggregate(pipeline);
      const docs = await cursor.toArray();

      return result.Success<T[], AppError>(docs as T[]).unwrap();
    } catch (error) {
      return result
        .Error<T[], AppError>(
          createAppError('MONGO_AGGREGATE_FAILED', 'Falha ao executar aggregate no MongoDB', {
            cause: error,
            details: {
              collection,
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
      await this.client.close();
      this.connected = false;
      this.client = null;
      this.db = null;
      return result.Success<void, AppError>(undefined).unwrap();
    } catch (error) {
      return result
        .Error<void, AppError>(
          createAppError('MONGO_CLOSE_FAILED', 'Falha ao encerrar conexao com o MongoDB', {
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
    if (this.connected && this.client && this.db) {
      return result.Success<void, AppError>(undefined).unwrap();
    }

    const connOutcome = await this.resolveConnectionString();
    const connHandled = result.from(connOutcome);
    if (connHandled.isError()) {
      return result.Error<void, AppError>(connHandled.ErrorValue()).unwrap();
    }
    const uri = connHandled.SuccessValue();

    const dbOutcome = await this.resolveDatabaseName();
    const dbHandled = result.from(dbOutcome);
    if (dbHandled.isError()) {
      return result.Error<void, AppError>(dbHandled.ErrorValue()).unwrap();
    }
    const dbName = dbHandled.SuccessValue();

    try {
      const client = new NativeMongoClient(uri);
      await client.connect();

      this.client = client;
      this.db = client.db(dbName) as unknown as {
        collection: (name: string) => unknown;
      };
      this.connected = true;

      return result.Success<void, AppError>(undefined).unwrap();
    } catch (error) {
      return result
        .Error<void, AppError>(
          createAppError('MONGO_CONNECT_FAILED', 'Falha ao conectar ao MongoDB', {
            cause: error,
          }),
        )
        .unwrap();
    }
  }

  /**
   * Resolve de forma lazy a connection string:
   * - Se foi definida nas options, reutiliza esse valor;
   * - Se existir `configClient`, tenta `MONGO_URL` (env → SSM/Secrets);
   * - Caso contrario, se nao houver valor, retorna erro `MONGO_CONNECTION_STRING_MISSING`.
   */
  private async resolveConnectionString(): Promise<Result<string, AppError>> {
    if (this.uri && this.uri.length > 0) {
      return result.Success<string, AppError>(this.uri).unwrap();
    }

    if (this.configClient) {
      const outcome = await this.configClient.getOptionalString('MONGO_URL');
      const handled = result.from(outcome);
      if (handled.isError()) {
        return result.Error<string, AppError>(handled.ErrorValue()).unwrap();
      }
      const fromConfig = handled.SuccessValue();
      if (fromConfig && fromConfig.length > 0) {
        this.uri = fromConfig;
        return result.Success<string, AppError>(fromConfig).unwrap();
      }
    }

    return result
      .Error<
        string,
        AppError
      >(createAppError('MONGO_CONNECTION_STRING_MISSING', 'Connection string do MongoDB nao configurada (MONGO_URL)'))
      .unwrap();
  }

  /**
   * Resolve de forma lazy o nome do database:
   * - Se foi definido nas options, reutiliza esse valor;
   * - Se existir `configClient`, tenta `MONGO_DB_NAME` (env → SSM/Secrets);
   * - Caso contrario, retorna erro `MONGO_DB_NAME_MISSING`.
   */
  private async resolveDatabaseName(): Promise<Result<string, AppError>> {
    if (this.dbName && this.dbName.length > 0) {
      return result.Success<string, AppError>(this.dbName).unwrap();
    }

    if (this.configClient) {
      const outcome = await this.configClient.getRequiredString('MONGO_DB_NAME');
      const handled = result.from(outcome);
      if (handled.isError()) {
        return handled.unwrap();
      }
      const fromConfig = handled.SuccessValue();
      this.dbName = fromConfig;
      return result.Success<string, AppError>(fromConfig).unwrap();
    }

    return result
      .Error<
        string,
        AppError
      >(createAppError('MONGO_DB_NAME_MISSING', 'Nome do database do MongoDB nao configurado (MONGO_DB_NAME)'))
      .unwrap();
  }
}
