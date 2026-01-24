import "reflect-metadata";
import { randomUUID } from "crypto";
import {
  CouchDBAdapter,
  CouchDBKeys,
  CreateIndexRequest,
  generateIndexes,
  generateViews,
  MangoQuery,
  ViewResponse,
} from "@decaf-ts/for-couchdb";
import { IndexError } from "@decaf-ts/for-couchdb";
import {
  BaseError,
  ConflictError,
  InternalError,
  NotFoundError,
  onCreate,
  onCreateUpdate,
  OperationKeys,
  PrimaryKeyType,
} from "@decaf-ts/db-decorators";
import {
  Adapter,
  Context,
  ContextOf,
  ContextualArgs,
  PersistenceKeys,
  RelationsMetadata,
  Repository,
  ConnectionError,
  UnsupportedError,
} from "@decaf-ts/core";
import Database = PouchDB.Database;
import Response = PouchDB.Core.Response;
import Err = PouchDB.Core.Error;
import IdMeta = PouchDB.Core.IdMeta;
import GetMeta = PouchDB.Core.GetMeta;
import { Model } from "@decaf-ts/decorator-validation";
import BulkGetResponse = PouchDB.Core.BulkGetResponse;
import FindResponse = PouchDB.Find.FindResponse;
import { PouchConfig, PouchFlags } from "./types";
import { DefaultLocalStoragePath, PouchFlavour } from "./constants";
import { PouchRepository } from "./PouchRepository";
import PouchDB from "pouchdb-core";
import * as PouchMapReduce from "pouchdb-mapreduce";
import * as PouchReplication from "pouchdb-replication";
import * as PouchFind from "pouchdb-find";
import { Constructor, Decoration, propMetadata } from "@decaf-ts/decoration";

/**
 * @description Sets the creator ID on a model during creation or update operations
 * @summary This function is used as a decorator handler to automatically set the creator ID field on a model
 * when it's being created or updated. It extracts the UUID from the context and assigns it to the specified key.
 * @template M - The model type that extends Model
 * @template R - The repository type that extends PouchRepository<M>
 * @template V - The relations metadata type that extends RelationsMetadata
 * @param {R} this - The repository instance
 * @param {Context<PouchFlags>} context - The operation context containing flags
 * @param {V} data - The relations metadata
 * @param key - The property key to set on the model
 * @param {M} model - The model instance to modify
 * @return {Promise<void>} A promise that resolves when the operation is complete
 * @function createdByOnPouchCreateUpdate
 * @memberOf module:for-pouch
 */
export async function createdByOnPouchCreateUpdate<
  M extends Model,
  R extends PouchRepository<M>,
  V extends RelationsMetadata,
>(
  this: R,
  context: ContextOf<R>,
  data: V,
  key: keyof M,
  model: M
): Promise<void> {
  try {
    const uuid: string = context.get("UUID");
    model[key] = uuid as M[keyof M];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e: unknown) {
    throw new UnsupportedError(
      "No User found in context. Please provide a user in the context"
    );
  }
}
/**
 * @description PouchDB implementation of the CouchDBAdapter
 * @summary Concrete adapter that bridges the generic CouchDBAdapter to a PouchDB backend. It supports CRUD (single and bulk), indexing and Mango queries, and wires flavour-specific decorations.
 * @template PouchFlags - The flags specific to PouchDB operations
 * @template Context<PouchFlags> - The context type with PouchDB flags
 * @param {PouchConfig} config - Adapter configuration (remote credentials or local storage path, db name, plugins)
 * @param {string} [alias] - Optional alias for the database
 * @class PouchAdapter
 * @example
 * ```typescript
 * import { PouchAdapter } from '@decaf-ts/for-pouch';
 *
 * // Create a PouchAdapter with config
 * const adapter = new PouchAdapter({
 *   protocol: 'http',
 *   host: 'localhost:5984',
 *   user: 'admin',
 *   password: 'secret',
 *   dbName: 'my-database',
 *   plugins: []
 * });
 *
 * // Or use local storage
 * const localAdapter = new PouchAdapter({
 *   protocol: 'http', // ignored for local
 *   dbName: 'local-db',
 *   storagePath: 'local_dbs',
 *   plugins: []
 * });
 *
 * // Use the adapter for database operations
 * const result = await adapter.read('users', 'user-123');
 * ```
 * @mermaid
 * sequenceDiagram
 *   participant Client
 *   participant PouchAdapter
 *   participant PouchDB
 *   participant CouchDB
 *
 *   Client->>PouchAdapter: new PouchAdapter(config, alias?)
 *   PouchAdapter->>CouchDBAdapter: super(config, PouchFlavour, alias)
 *
 *   Client->>PouchAdapter: create(table, id, model)
 *   PouchAdapter->>PouchDB: put(model)
 *   PouchDB->>CouchDB: HTTP PUT
 *   CouchDB-->>PouchDB: Response
 *   PouchDB-->>PouchAdapter: Response
 *   PouchAdapter-->>Client: Updated model
 *
 *   Client->>PouchAdapter: read(table, id)
 *   PouchAdapter->>PouchDB: get(id)
 *   PouchDB->>CouchDB: HTTP GET
 *   CouchDB-->>PouchDB: Document
 *   PouchDB-->>PouchAdapter: Document
 *   PouchAdapter-->>Client: Model
 */
export class PouchAdapter extends CouchDBAdapter<
  PouchConfig,
  Database,
  Context<PouchFlags>
> {
  constructor(config: PouchConfig, alias?: string) {
    super(config, PouchFlavour, alias);
  }

  private _adminClient?: Database;
  private _pluginsRegistered = false;

  private registerPlugins(): void {
    if (this._pluginsRegistered) return;
    const plugins = [
      PouchMapReduce,
      PouchReplication,
      PouchFind,
      ...this.config.plugins,
    ];
    for (const plugin of plugins) {
      try {
        PouchDB.plugin(plugin);
      } catch (e: any) {
        if (e instanceof Error && e.message.includes("redefine property")) continue;
        throw e;
      }
    }
    this._pluginsRegistered = true;
  }

  private buildClient(user?: string, password?: string): Database {
    this.registerPlugins();
    const { host, protocol, dbName, storagePath } = this.config;
    try {
      if (host) {
        const authUser = user ? encodeURIComponent(user) : "";
        const authPassword = user && password ? `:${encodeURIComponent(password)}` : "";
        const credentials = user ? `${authUser}${authPassword}@` : "";
        return new PouchDB(`${protocol}://${credentials}${host}/${dbName}`);
      }
      return new PouchDB(`${storagePath || DefaultLocalStoragePath}/${dbName}`);
    } catch (e: unknown) {
      throw new InternalError(`Failed to create PouchDB client: ${e}`);
    }
  }

  protected getAdminClient(): Database {
    if (!this.config.adminUser) {
      return this.getClient();
    }
    if (!this._adminClient) {
      this._adminClient = this.buildClient(
        this.config.adminUser,
        this.config.adminPassword ?? this.config.password
      );
    }
    return this._adminClient;
  }

  /**
   * @description Lazily initializes and returns the underlying PouchDB client
   * @summary Loads required PouchDB plugins once, builds the connection URL or local storage path from config, and caches the Database instance for reuse. Throws InternalError if client creation fails.
   * @return {Database} A PouchDB Database instance ready to perform operations
   * @mermaid
   * sequenceDiagram
   *   participant Caller
   *   participant PouchAdapter
   *   participant PouchDB
   *   Caller->>PouchAdapter: getClient()
   *   alt client not initialized
   *     PouchAdapter->>PouchAdapter: register plugins
   *     PouchAdapter->>PouchDB: new PouchDB(url or path)
   *     alt creation fails
   *       PouchDB-->>PouchAdapter: Error
   *       PouchAdapter-->>Caller: throws InternalError
   *     else success
   *       PouchDB-->>PouchAdapter: Database
   *       PouchAdapter-->>Caller: cached client
   *     end
   *   else client initialized
   *     PouchAdapter-->>Caller: cached client
   *   end
   */
  override getClient(): Database {
    if (!this._client) {
      this._client = this.buildClient(this.config.user, this.config.password);
    }
    return this._client as Database;
  }

  /**
   * @description Generates operation flags for PouchDB operations
   * @summary Creates a set of flags for a specific operation, including a UUID for identification.
   * This method extracts the user ID from the database URL or generates a random UUID if not available.
   * @template M - The model type that extends Model
   * @param {OperationKeys} operation - The operation key (create, read, update, delete)
   * @param {Constructor<M>} model - The model constructor
   * @param {Partial<PouchFlags>} flags - Partial flags to be merged
   * @return {Promise<PouchFlags>} The complete set of flags for the operation
   */
  protected override async flags<M extends Model>(
    operation: OperationKeys,
    model: Constructor<M>,
    flags: Partial<PouchFlags>,
    ...args: any[]
  ): Promise<PouchFlags> {
    if (!this.config.user) this.config.user = randomUUID();
    return super.flags(
      operation,
      model,
      Object.assign(
        {
          UUID: this.config.user,
        },
        flags
      ),
      ...args
    );
  }

  override repository<
    R extends Repository<
      any,
      Adapter<PouchConfig, Database, MangoQuery, Context<PouchFlags>>
    >,
  >(): Constructor<R> {
    return PouchRepository as unknown as Constructor<R>;
  }

  /**
   * @description Creates database indexes for the given models
   * @summary Generates and creates indexes in the PouchDB database based on the provided model constructors.
   * This method uses the generateIndexes utility to create index definitions and then creates them in the database.
   * @template M - The model type that extends Model
   * @param models - The model constructors to create indexes for
   * @return {Promise<void>} A promise that resolves when all indexes are created
   */
  protected override async index<M extends Model>(
    ...models: Constructor<M>[]
  ): Promise<void> {
    const client = this.getAdminClient();
    try {
      const MAX_INDEX_ATTEMPTS = 3;
      const indexes: CreateIndexRequest[] = generateIndexes(models);
      const existingIndexNames = new Set<string>();
      try {
        const response = await (client as any).get("_index");
        const existing = response?.indexes || [];
        existing.forEach((idx: any) => {
          if (idx.name) existingIndexNames.add(idx.name);
        });
      } catch {
        // ignore if _index endpoint is unavailable
      }
      for (const index of indexes) {
        const indexName = index.name ?? index.ddoc ?? "index";
        if (existingIndexNames.has(indexName)) continue;
        let attempts = 0;
        while (true) {
          try {
            await client.createIndex(index as any);
            existingIndexNames.add(indexName);
            break;
          } catch (e: any) {
            if (e?.status === 409 || e?.error === "conflict") break;
            if (e?.status === 500) {
              attempts += 1;
              const docId =
                `_design/${index.ddoc ?? indexName}`;
              try {
                const existing = await client.get(docId);
                await client.remove(docId, existing._rev);
              } catch {
                // ignore missing doc or removal errors
              }
              if (attempts >= MAX_INDEX_ATTEMPTS) break;
              await new Promise((resolve) =>
                setTimeout(resolve, 100 * attempts)
              );
              continue;
            }
            throw e;
          }
        }
      }

      const views = generateViews(models);
      for (const view of views) {
        try {
          await client.put(view as any);
        } catch (e: any) {
          if (e?.status === 409 || e?.error === "conflict") {
            const existing = await client.get(view._id);
            await client.put({
              ...(view as any),
              _rev: existing._rev,
            } as any);
          } else {
            throw e;
          }
        }
      }
    } catch (e: any) {
      console.warn(
        "Unable to create indexes/views for PouchAdapter, proceeding without them.",
        e
      );
    }
  }

  /**
   * @description Creates a new document in the database
   * @summary Inserts a new document into the PouchDB database using the put operation.
   * This method handles error parsing and ensures the operation was successful.
   * @param {string} tableName - The name of the table/collection
   * @param {string|number} id - The document ID
   * @param {Record<string, any>} model - The document data to insert
   * @return {Promise<Record<string, any>>} A promise that resolves to the created document with metadata
   * @mermaid
   * sequenceDiagram
   *   participant Client
   *   participant PouchAdapter
   *   participant PouchDB
   *
   *   Client->>PouchAdapter: create(tableName, id, model)
   *   PouchAdapter->>PouchDB: put(model)
   *   alt Success
   *     PouchDB-->>PouchAdapter: Response with ok=true
   *     PouchAdapter->>PouchAdapter: assignMetadata(model, response.rev)
   *     PouchAdapter-->>Client: Updated model with metadata
   *   else Error
   *     PouchDB-->>PouchAdapter: Error
   *     PouchAdapter->>PouchAdapter: parseError(e)
   *     PouchAdapter-->>Client: Throws error
   *   end
   */
  override async create<M extends Model>(
    tableName: Constructor<M>,
    id: PrimaryKeyType,
    model: Record<string, any>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ...args: ContextualArgs<Context<PouchFlags>>
  ): Promise<Record<string, any>> {
    let response: Response;
    try {
      response = await this.client.put(model);
    } catch (e: unknown) {
      throw this.parseError(e as Error);
    }

    if (!response.ok)
      throw new InternalError(
        `Failed to insert doc id: ${id} in table ${Model.tableName(tableName)}`
      );
    return this.assignMetadata(model, response.rev);
  }

  /**
   * @description Creates multiple documents in the database in a single operation
   * @summary Inserts multiple documents into the PouchDB database using the bulkDocs operation.
   * This method handles error parsing and ensures all operations were successful.
   * @param {string} tableName - The name of the table/collection
   * @param {string[]|number[]} ids - The document IDs
   * @param  models - The document data to insert
   * @return A promise that resolves to the created documents with metadata
   * @mermaid
   * sequenceDiagram
   *   participant Client
   *   participant PouchAdapter
   *   participant PouchDB
   *
   *   Client->>PouchAdapter: createAll(tableName, ids, models)
   *   PouchAdapter->>PouchDB: bulkDocs(models)
   *   alt Success
   *     PouchDB-->>PouchAdapter: Array of responses with ok=true
   *     PouchAdapter->>PouchAdapter: assignMultipleMetadata(models, revs)
   *     PouchAdapter-->>Client: Updated models with metadata
   *   else Error
   *     PouchDB-->>PouchAdapter: Array with errors
   *     PouchAdapter->>PouchAdapter: Check for errors
   *     PouchAdapter-->>Client: Throws InternalError
   *   end
   */
  override async createAll<M extends Model>(
    tableName: Constructor<M>,
    ids: PrimaryKeyType[],
    models: Record<string, any>[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ...args: ContextualArgs<Context<PouchFlags>>
  ): Promise<Record<string, any>[]> {
    let response: Response[] | Err[];
    try {
      response = await this.client.bulkDocs(models);
    } catch (e: any) {
      throw this.parseError(e);
    }
    if (!response.every((r: Response | Err) => (r as Response).ok)) {
      const errors = response.reduce((accum: string[], el, i) => {
        if (el.error)
          accum.push(
            `el ${i}: ${el.error}${el.reason ? ` - ${el.reason}` : ""}`
          );
        return accum;
      }, []);
      throw new InternalError(errors.join("\n"));
    }

    return this.assignMultipleMetadata(
      models,
      response.map((r) => r.rev as string)
    );
  }

  /**
   * @description Retrieves a document from the database by ID
   * @summary Fetches a document from the PouchDB database using the get operation.
   * This method generates the document ID based on the table name and ID, then retrieves the document.
   * @param {string} tableName - The name of the table/collection
   * @param {string|number} id - The document ID
   * @return {Promise<Record<string, any>>} A promise that resolves to the retrieved document with metadata
   * @mermaid
   * sequenceDiagram
   *   participant Client
   *   participant PouchAdapter
   *   participant PouchDB
   *
   *   Client->>PouchAdapter: read(tableName, id)
   *   PouchAdapter->>PouchAdapter: generateId(tableName, id)
   *   PouchAdapter->>PouchDB: get(_id)
   *   alt Success
   *     PouchDB-->>PouchAdapter: Document
   *     PouchAdapter->>PouchAdapter: assignMetadata(record, record._rev)
   *     PouchAdapter-->>Client: Document with metadata
   *   else Error
   *     PouchDB-->>PouchAdapter: Error
   *     PouchAdapter->>PouchAdapter: parseError(e)
   *     PouchAdapter-->>Client: Throws error
   *   end
   */
  override async read<M extends Model>(
    tableName: Constructor<M>,
    id: PrimaryKeyType,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ...args: ContextualArgs<Context<PouchFlags>>
  ): Promise<Record<string, any>> {
    const _id = this.generateId(Model.tableName(tableName), id);
    let record: IdMeta & GetMeta;
    try {
      record = await this.client.get(_id);
    } catch (e: any) {
      throw this.parseError(e);
    }
    return this.assignMetadata(record, record._rev);
  }

  /**
   * @description Retrieves multiple documents from the database by their IDs
   * @summary Fetches multiple documents from the PouchDB database using the bulkGet operation.
   * This method generates document IDs based on the table name and IDs, then retrieves the documents.
   * @param {string} tableName - The name of the table/collection
   * @param {Array<string|number|bigint>} ids - The document IDs
   * @return A promise that resolves to the retrieved documents with metadata
   * @mermaid
   * sequenceDiagram
   *   participant Client
   *   participant PouchAdapter
   *   participant PouchDB
   *
   *   Client->>PouchAdapter: readAll(tableName, ids)
   *   PouchAdapter->>PouchAdapter: Map ids to generateId(tableName, id)
   *   PouchAdapter->>PouchDB: bulkGet({docs})
   *   alt Success
   *     PouchDB-->>PouchAdapter: BulkGetResponse
   *     PouchAdapter->>PouchAdapter: Process results
   *     PouchAdapter->>PouchAdapter: assignMetadata for each doc
   *     PouchAdapter-->>Client: Documents with metadata
   *   else Error
   *     PouchAdapter->>PouchAdapter: parseError(error)
   *     PouchAdapter-->>Client: Throws error
   *   end
   */
  override async readAll<M extends Model>(
    tableName: Constructor<M>,
    ids: (string | number | bigint)[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ...args: ContextualArgs<Context<PouchFlags>>
  ): Promise<Record<string, any>[]> {
    const table = Model.tableName(tableName);
    const results: BulkGetResponse<any> = await this.client.bulkGet({
      docs: ids.map((id) => ({ id: this.generateId(table, id as any) })),
    });
    const res = results.results.reduce((accum: any[], r) => {
      r.docs.forEach((d) => {
        if ((d as any).error || !(d as any).ok)
          throw this.parseError(
            ((d as { error: Err }).error as Error) ||
              new InternalError("Missing valid response")
          );
        const result = Object.assign({}, (d as { ok: any }).ok);
        accum.push(this.assignMetadata(result, (d as any).ok[CouchDBKeys.REV]));
      });
      return accum;
    }, []);

    return res;
  }

  /**
   * @description Updates an existing document in the database
   * @summary Updates a document in the PouchDB database using the put operation.
   * This method handles error parsing and ensures the operation was successful.
   * @param {string} tableName - The name of the table/collection
   * @param {string|number} id - The document ID
   * @param {Record<string, any>} model - The updated document data
   * @return {Promise<Record<string, any>>} A promise that resolves to the updated document with metadata
   * @mermaid
   * sequenceDiagram
   *   participant Client
   *   participant PouchAdapter
   *   participant PouchDB
   *
   *   Client->>PouchAdapter: update(tableName, id, model)
   *   PouchAdapter->>PouchDB: put(model)
   *   alt Success
   *     PouchDB-->>PouchAdapter: Response with ok=true
   *     PouchAdapter->>PouchAdapter: assignMetadata(model, response.rev)
   *     PouchAdapter-->>Client: Updated model with metadata
   *   else Error
   *     PouchDB-->>PouchAdapter: Error
   *     PouchAdapter->>PouchAdapter: parseError(e)
   *     PouchAdapter-->>Client: Throws error
   *   end
   */
  override async update<M extends Model>(
    tableName: Constructor<M>,
    id: PrimaryKeyType,
    model: Record<string, any>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ...args: ContextualArgs<Context<PouchFlags>>
  ): Promise<Record<string, any>> {
    let response: Response;
    try {
      response = await this.client.put(model);
    } catch (e: any) {
      throw this.parseError(e);
    }

    if (!response.ok)
      throw new InternalError(
        `Failed to update doc id: ${id} in table ${Model.tableName(tableName)}`
      );
    return this.assignMetadata(model, response.rev);
  }

  /**
   * @description Updates multiple documents in the database in a single operation
   * @summary Updates multiple documents in the PouchDB database using the bulkDocs operation.
   * This method handles error parsing and ensures all operations were successful.
   * @param {string} tableName - The name of the table/collection
   * @param {string[]|number[]} ids - The document IDs
   * @param models - The updated document data
   * @return A promise that resolves to the updated documents with metadata
   * @mermaid
   * sequenceDiagram
   *   participant Client
   *   participant PouchAdapter
   *   participant PouchDB
   *
   *   Client->>PouchAdapter: updateAll(tableName, ids, models)
   *   PouchAdapter->>PouchDB: bulkDocs(models)
   *   alt Success
   *     PouchDB-->>PouchAdapter: Array of responses with ok=true
   *     PouchAdapter->>PouchAdapter: assignMultipleMetadata(models, revs)
   *     PouchAdapter-->>Client: Updated models with metadata
   *   else Error
   *     PouchDB-->>PouchAdapter: Array with errors
   *     PouchAdapter->>PouchAdapter: Check for errors
   *     PouchAdapter-->>Client: Throws InternalError
   *   end
   */
  override async updateAll<M extends Model>(
    tableName: Constructor<M>,
    ids: PrimaryKeyType[],
    models: Record<string, any>[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ...args: ContextualArgs<Context<PouchFlags>>
  ): Promise<Record<string, any>[]> {
    let response: (Response | Err)[];
    try {
      response = await this.client.bulkDocs(models);
    } catch (e: any) {
      throw this.parseError(e);
    }
    if (!response.every((r) => !(r as any).error)) {
      const errors = response.reduce((accum: string[], el, i) => {
        if ((el as any).error)
          accum.push(
            `el ${i}: ${(el as any).error}${(el as any).reason ? ` - ${(el as any).reason}` : ""}`
          );
        return accum;
      }, []);
      throw new InternalError(errors.join("\n"));
    }

    return this.assignMultipleMetadata(
      models,
      response.map((r) => r.rev as string)
    );
  }

  /**
   * @description Deletes a document from the database by ID
   * @summary Removes a document from the PouchDB database using the remove operation.
   * This method first retrieves the document to get its revision, then deletes it.
   * @param {string} tableName - The name of the table/collection
   * @param {string|number} id - The document ID
   * @return {Promise<Record<string, any>>} A promise that resolves to the deleted document with metadata
   * @mermaid
   * sequenceDiagram
   *   participant Client
   *   participant PouchAdapter
   *   participant PouchDB
   *
   *   Client->>PouchAdapter: delete(tableName, id)
   *   PouchAdapter->>PouchAdapter: generateId(tableName, id)
   *   PouchAdapter->>PouchDB: get(_id)
   *   PouchDB-->>PouchAdapter: Document with _rev
   *   PouchAdapter->>PouchDB: remove(_id, record._rev)
   *   alt Success
   *     PouchDB-->>PouchAdapter: Success response
   *     PouchAdapter->>PouchAdapter: assignMetadata(record, record._rev)
   *     PouchAdapter-->>Client: Deleted document with metadata
   *   else Error
   *     PouchDB-->>PouchAdapter: Error
   *     PouchAdapter->>PouchAdapter: parseError(e)
   *     PouchAdapter-->>Client: Throws error
   *   end
   */
  override async delete<M extends Model>(
    tableName: Constructor<M>,
    id: PrimaryKeyType,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ...args: ContextualArgs<Context<PouchFlags>>
  ): Promise<Record<string, any>> {
    const _id = this.generateId(Model.tableName(tableName), id);
    let record: IdMeta & GetMeta;
    try {
      record = await this.client.get(_id);
      await this.client.remove(_id, record._rev);
    } catch (e: any) {
      throw this.parseError(e);
    }
    return this.assignMetadata(record, record._rev);
  }

  /**
   * @description Deletes multiple documents from the database by their IDs
   * @summary Removes multiple documents from the PouchDB database in a single operation.
   * This method first retrieves all documents to get their revisions, then marks them as deleted.
   * @param {string} tableName - The name of the table/collection
   * @param {Array<string|number|bigint>} ids - The document IDs
   * @return A promise that resolves to the deleted documents with metadata
   * @mermaid
   * sequenceDiagram
   *   participant Client
   *   participant PouchAdapter
   *   participant PouchDB
   *
   *   Client->>PouchAdapter: deleteAll(tableName, ids)
   *   PouchAdapter->>PouchAdapter: Map ids to generateId(tableName, id)
   *   PouchAdapter->>PouchDB: bulkGet({docs})
   *   PouchDB-->>PouchAdapter: BulkGetResponse with documents
   *   PouchAdapter->>PouchAdapter: Mark documents as deleted
   *   PouchAdapter->>PouchDB: bulkDocs(marked documents)
   *   alt Success
   *     PouchDB-->>PouchAdapter: Success responses
   *     PouchAdapter->>PouchAdapter: Process results
   *     PouchAdapter->>PouchAdapter: assignMetadata for each doc
   *     PouchAdapter-->>Client: Deleted documents with metadata
   *   else Error
   *     PouchAdapter->>PouchAdapter: Check for errors
   *     PouchAdapter-->>Client: Throws InternalError
   *   end
   */
  override async deleteAll<M extends Model>(
    tableName: Constructor<M>,
    ids: (string | number | bigint)[],
    ...args: ContextualArgs<Context<PouchFlags>>
  ): Promise<Record<string, any>[]> {
    const { log } = this.logCtx(args, this.deleteAll);
    const table = Model.tableName(tableName);
    const results: BulkGetResponse<any> = await this.client.bulkGet({
      docs: ids.map((id) => ({ id: this.generateId(table, id as any) })),
    });

    const docsToDelete = results.results.reduce(
      (accum: Record<string, any>[], r) => {
        r.docs.forEach((d) => {
          if ((d as any).error)
            throw this.parseError(
              ((d as { error: Err }).error as Error) ||
                new InternalError("Missing valid response")
            );
          const next = Object.assign({}, (d as { ok: any }).ok);
          next[CouchDBKeys.DELETED] = true;
          accum.push(next);
        });
        return accum;
      },
      []
    );

    const deletion: (Response | Err)[] =
      await this.client.bulkDocs(docsToDelete);

    deletion.forEach((d) => {
      const err = (d as Err).error;
      if (err) log.error(String(err));
    });

    return results.results.reduce((accum: any[], r) => {
      r.docs.forEach((d) => {
        if ((d as any).error || !(d as any).ok)
          throw this.parseError(
            ((d as { error: Err }).error as Error) ||
              new InternalError("Missing valid response")
          );
        const result = Object.assign({}, (d as { ok: any }).ok);
        accum.push(this.assignMetadata(result, (d as any).ok[CouchDBKeys.REV]));
      });
      return accum;
    }, []);
  }

  /**
   * @description Executes a raw Mango query against the database
   * @summary Runs a Mango query and optionally returns only the documents array or the entire response
   * @template V - The return value type
   * @param {MangoQuery} rawInput - The Mango query to execute
   * @param {boolean} [docsOnly=true] - Whether to return only the documents array
   * @return {Promise<V>} A promise resolving the query result
   */
  override async raw<V>(
    rawInput: MangoQuery,
    docsOnly = true,
    ...args: ContextualArgs<Context<PouchFlags>>
  ): Promise<V> {
    try {
      const response: FindResponse<any> = await this.client.find(rawInput as any);
      if (response.warning) {
        const { log } = await this.logCtx(args, this.raw, true);
        log.for(this.raw).warn(response.warning);
      }
      if (docsOnly) return response.docs as V;
      return response as V;
    } catch (e: any) {
      throw this.parseError(e);
    }
  }

  async view<R>(
    ddoc: string,
    viewName: string,
    options: Record<string, any>,
    ..._args: ContextualArgs<Context<PouchFlags>>
  ): Promise<ViewResponse<R>> {
    void _args;
    try {
      const queryName = `${ddoc}/${viewName}`;
      return (await this.client.query(queryName, options)) as ViewResponse<R>;
    } catch (e: any) {
      throw this.parseError(e);
    }
  }

  /**
   * @description Parses and converts errors from PouchDB to application-specific errors
   * @summary Converts PouchDB errors to the application's error hierarchy.
   * This instance method delegates to the static parseError method.
   * @param {Error|string} err - The error object or message to parse
   * @param {string} [reason] - Optional reason for the error
   * @return {BaseError} The converted error object
   */
  override parseError<E extends BaseError>(
    err: Error | string,
    reason?: string
  ): E {
    return PouchAdapter.parseError<E>(err, reason);
  }

  /**
   * @description Static method to parse and convert errors from PouchDB to application-specific errors
   * @summary Converts PouchDB errors to the application's error hierarchy based on error codes and messages.
   * This method analyzes the error type, status code, or message to determine the appropriate error class.
   * @param {Error|string} err - The error object or message to parse
   * @param {string} [reason] - Optional reason for the error
   * @return {BaseError} The converted error object
   * @mermaid
   * sequenceDiagram
   *   participant Caller
   *   participant PouchAdapter
   *
   *   Caller->>PouchAdapter: parseError(err, reason)
   *   alt err is BaseError
   *     PouchAdapter-->>Caller: Return err as is
   *   else err is string
   *     alt contains "already exist" or "update conflict"
   *       PouchAdapter-->>Caller: ConflictError
   *     else contains "missing" or "deleted"
   *       PouchAdapter-->>Caller: NotFoundError
   *     end
   *   else err has status/statusCode/code
   *     Note over PouchAdapter: Extract code and reason
   *   else
   *     Note over PouchAdapter: Use err.message as code
   *   end
   *
   *   Note over PouchAdapter: Switch on code
   *   alt code is 401, 412, or 409
   *     PouchAdapter->>ErrorTypes: ConflictError
   *   else code is 404
   *     PouchAdapter->>ErrorTypes: NotFoundError
   *   else code is 400
   *     alt code contains "No index exists"
   *       PouchAdapter->>ErrorTypes: IndexError
   *     else
   *       PouchAdapter->>ErrorTypes: InternalError
   *   else code contains "ECONNREFUSED"
   *     PouchAdapter->>ErrorTypes: ConnectionError
   *   else
   *     PouchAdapter->>ErrorTypes: InternalError
   *   end
   */
  static override parseError<E extends BaseError>(
    err: Error | string,
    reason?: string
  ): E {
    if (err instanceof BaseError) return err as E;
    let code: string = "";
    if (typeof err === "string") {
      code = err;
      if (code.match(/already exist|update conflict/g))
        return new ConflictError(code) as E;
      if (code.match(/missing|deleted/g)) return new NotFoundError(code) as E;
    } else if ((err as any).status) {
      code = (err as any).status;
      reason = reason || err.message;
    } else if ((err as any).code) {
      code = (err as any).code;
      reason = reason || err.message;
    } else if ((err as any).statusCode) {
      code = (err as any).statusCode;
      reason = reason || err.message;
    } else {
      code = err.message;
    }

    switch (code.toString()) {
      case "401":
      case "412":
      case "409":
        return new ConflictError(reason as string) as E;
      case "404":
        return new NotFoundError(reason as string) as E;
      case "400":
        if (code.toString().match(/No\sindex\sexists/g))
          return new IndexError(err) as E;
        return new InternalError(err) as E;
      default:
        if (code.toString().match(/ECONNREFUSED/g))
          return new ConnectionError(err) as E;
        return new InternalError(err) as E;
    }
  }

  /**
   * @description Sets up decorations for PouchDB-specific model properties
   * @summary Configures decorators for createdBy and updatedBy fields in models.
   * This method defines how these fields should be automatically populated during create and update operations.
   */
  static override decoration() {
    super.decoration();
    Decoration.flavouredAs(PouchFlavour)
      .for(PersistenceKeys.CREATED_BY)
      .define(
        onCreate(createdByOnPouchCreateUpdate),
        propMetadata(PersistenceKeys.CREATED_BY, {})
      )
      .apply();
    Decoration.flavouredAs(PouchFlavour)
      .for(PersistenceKeys.UPDATED_BY)
      .define(
        onCreateUpdate(createdByOnPouchCreateUpdate),
        propMetadata(PersistenceKeys.UPDATED_BY, {})
      )
      .apply();
  }
}

Adapter.setCurrent(PouchFlavour);
