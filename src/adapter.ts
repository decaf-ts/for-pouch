import "reflect-metadata";
import {
  CouchDBAdapter,
  CouchDBKeys,
  CreateIndexRequest,
  generateIndexes,
  IndexError,
  MangoQuery,
} from "@decaf-ts/for-couchdb";
import {
  BaseError,
  ConflictError,
  Context,
  InternalError,
  NotFoundError,
  onCreate,
  OperationKeys,
} from "@decaf-ts/db-decorators";
import {
  ConnectionError,
  PersistenceKeys,
  RelationsMetadata,
  Repository,
  UnsupportedError,
} from "@decaf-ts/core";
import Database = PouchDB.Database;
import Response = PouchDB.Core.Response;
import Err = PouchDB.Core.Error;
import IdMeta = PouchDB.Core.IdMeta;
import GetMeta = PouchDB.Core.GetMeta;
import CreateIndexResponse = PouchDB.Find.CreateIndexResponse;
import {
  Constructor,
  Decoration,
  Model,
  propMetadata,
} from "@decaf-ts/decorator-validation";
import BulkGetResponse = PouchDB.Core.BulkGetResponse;
import FindResponse = PouchDB.Find.FindResponse;
import { PouchFlags } from "./types";
import { PouchFlavour } from "./constants";
import { PouchRepository } from "./PouchRepository";

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
 * @param {keyof M} key - The property key to set on the model
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
  context: Context<PouchFlags>,
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
 * @summary This class provides a concrete implementation of the CouchDBAdapter for PouchDB.
 * It handles all database operations like create, read, update, delete (CRUD) for both
 * single documents and bulk operations. It also provides methods for querying and indexing.
 * @template Database - The PouchDB database type
 * @template PouchFlags - The flags specific to PouchDB operations
 * @template Context<PouchFlags> - The context type with PouchDB flags
 * @param {Database} scope - The PouchDB database instance
 * @param {string} [alias] - Optional alias for the database
 * @class PouchAdapter
 * @example
 * ```typescript
 * import PouchDB from 'pouchdb';
 * import { PouchAdapter } from '@decaf-ts/for-pouch';
 * 
 * // Create a new PouchDB instance
 * const db = new PouchDB('my-database');
 * 
 * // Create a PouchAdapter with the database
 * const adapter = new PouchAdapter(db);
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
 *   Client->>PouchAdapter: new PouchAdapter(db)
 *   PouchAdapter->>CouchDBAdapter: super(scope, PouchFlavour, alias)
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
  Database,
  PouchFlags,
  Context<PouchFlags>
> {
  constructor(scope: Database, alias?: string) {
    super(scope, PouchFlavour, alias);
  }

  /**
   * @description Generates operation flags for PouchDB operations
   * @summary Creates a set of flags for a specific operation, including a UUID for identification.
   * This method extracts the user ID from the database URL or generates a random UUID if not available.
   * @template M - The model type that extends Model
   * @param {OperationKeys} operation - The operation key (create, read, update, delete)
   * @param {Constructor<M>} model - The model constructor
   * @param {Partial<PouchFlags>} flags - Partial flags to be merged
   * @return {PouchFlags} The complete set of flags for the operation
   */
  protected override flags<M extends Model>(
    operation: OperationKeys,
    model: Constructor<M>,
    flags: Partial<PouchFlags>
  ): PouchFlags {
    let id: string = "";
    const url = (this.native as unknown as { name: string }).name;
    if (url) {
      const regexp = /https?:\/\/(.+?):.+?@/g;
      const m = regexp.exec(url);
      if (m) id = m[1];
    }
    if (!id) {
      id = crypto.randomUUID();
    }

    return Object.assign(super.flags(operation, model, flags), {
      UUID: id,
    }) as PouchFlags;
  }

  /**
   * @description Creates database indexes for the given models
   * @summary Generates and creates indexes in the PouchDB database based on the provided model constructors.
   * This method uses the generateIndexes utility to create index definitions and then creates them in the database.
   * @template M - The model type that extends Model
   * @param {...Constructor<M>[]} models - The model constructors to create indexes for
   * @return {Promise<void>} A promise that resolves when all indexes are created
   */
  protected async index<M extends Model>(
    ...models: Constructor<M>[]
  ): Promise<void> {
    const indexes: CreateIndexRequest[] = generateIndexes(models);
    for (const index of indexes) {
      const res: CreateIndexResponse<any> = await this.native.createIndex(
        index as any
      );
      const { result } = res;
      if (result === "existing")
        throw new ConflictError(`Index ${index.name} already exists`);
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
  async create(
    tableName: string,
    id: string | number,
    model: Record<string, any>
  ): Promise<Record<string, any>> {
    let response: Response;
    try {
      response = await this.native.put(model);
    } catch (e: unknown) {
      throw this.parseError(e as Error);
    }

    if (!response.ok)
      throw new InternalError(
        `Failed to insert doc id: ${id} in table ${tableName}`
      );
    return this.assignMetadata(model, response.rev);
  }

  /**
   * @description Creates multiple documents in the database in a single operation
   * @summary Inserts multiple documents into the PouchDB database using the bulkDocs operation.
   * This method handles error parsing and ensures all operations were successful.
   * @param {string} tableName - The name of the table/collection
   * @param {string[]|number[]} ids - The document IDs
   * @param {Record<string, any>[]} models - The document data to insert
   * @return {Promise<Record<string, any>[]>} A promise that resolves to the created documents with metadata
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
  override async createAll(
    tableName: string,
    ids: string[] | number[],
    models: Record<string, any>[]
  ): Promise<Record<string, any>[]> {
    let response: Response[] | Err[];
    try {
      response = await this.native.bulkDocs(models);
    } catch (e: any) {
      throw PouchAdapter.parseError(e);
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
  async read(
    tableName: string,
    id: string | number
  ): Promise<Record<string, any>> {
    const _id = this.generateId(tableName, id);
    let record: IdMeta & GetMeta;
    try {
      record = await this.native.get(_id);
    } catch (e: any) {
      throw PouchAdapter.parseError(e);
    }
    return this.assignMetadata(record, record._rev);
  }

  /**
   * @description Retrieves multiple documents from the database by their IDs
   * @summary Fetches multiple documents from the PouchDB database using the bulkGet operation.
   * This method generates document IDs based on the table name and IDs, then retrieves the documents.
   * @param {string} tableName - The name of the table/collection
   * @param {(string|number|bigint)[]} ids - The document IDs
   * @return {Promise<Record<string, any>[]>} A promise that resolves to the retrieved documents with metadata
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
  override async readAll(
    tableName: string,
    ids: (string | number | bigint)[]
  ): Promise<Record<string, any>[]> {
    const results: BulkGetResponse<any> = await this.native.bulkGet({
      docs: ids.map((id) => ({ id: this.generateId(tableName, id as any) })),
    });
    const res = results.results.reduce((accum: any[], r) => {
      r.docs.forEach((d) => {
        if ((d as any).error || !(d as any).ok)
          throw PouchAdapter.parseError(
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
  override async update(
    tableName: string,
    id: string | number,
    model: Record<string, any>
  ): Promise<Record<string, any>> {
    let response: Response;
    try {
      response = await this.native.put(model);
    } catch (e: any) {
      throw PouchAdapter.parseError(e);
    }

    if (!response.ok)
      throw new InternalError(
        `Failed to update doc id: ${id} in table ${tableName}`
      );
    return this.assignMetadata(model, response.rev);
  }

  /**
   * @description Updates multiple documents in the database in a single operation
   * @summary Updates multiple documents in the PouchDB database using the bulkDocs operation.
   * This method handles error parsing and ensures all operations were successful.
   * @param {string} tableName - The name of the table/collection
   * @param {string[]|number[]} ids - The document IDs
   * @param {Record<string, any>[]} models - The updated document data
   * @return {Promise<Record<string, any>[]>} A promise that resolves to the updated documents with metadata
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
  override async updateAll(
    tableName: string,
    ids: string[] | number[],
    models: Record<string, any>[]
  ): Promise<Record<string, any>[]> {
    let response: (Response | Err)[];
    try {
      response = await this.native.bulkDocs(models);
    } catch (e: any) {
      throw PouchAdapter.parseError(e);
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
  override async delete(
    tableName: string,
    id: string | number
  ): Promise<Record<string, any>> {
    const _id = this.generateId(tableName, id);
    let record: IdMeta & GetMeta;
    try {
      record = await this.native.get(_id);
      await this.native.remove(_id, record._rev);
    } catch (e: any) {
      throw PouchAdapter.parseError(e);
    }
    return this.assignMetadata(record, record._rev);
  }

  /**
   * @description Deletes multiple documents from the database by their IDs
   * @summary Removes multiple documents from the PouchDB database in a single operation.
   * This method first retrieves all documents to get their revisions, then marks them as deleted.
   * @param {string} tableName - The name of the table/collection
   * @param {(string|number|bigint)[]} ids - The document IDs
   * @return {Promise<Record<string, any>[]>} A promise that resolves to the deleted documents with metadata
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
  override async deleteAll(
    tableName: string,
    ids: (string | number | bigint)[]
  ): Promise<Record<string, any>[]> {
    const results: BulkGetResponse<any> = await this.native.bulkGet({
      docs: ids.map((id) => ({ id: this.generateId(tableName, id as any) })),
    });

    const deletion: (Response | Err)[] = await this.native.bulkDocs(
      results.results.map((r) => {
        (r as any)[CouchDBKeys.DELETED] = true;
        return r;
      })
    );

    const errs = deletion.filter((d) => (d as any).error);
    if (errs.length) throw new InternalError(errs.join("\n"));

    return results.results.reduce((accum: any[], r) => {
      r.docs.forEach((d) => {
        const result = Object.assign({}, (d as { ok: any }).ok);
        accum.push(this.assignMetadata(result, (d as any).ok[CouchDBKeys.REV]));
      });
      return accum;
    }, []);
  }

  /**
   * @description Executes a raw Mango query against the database
   * @summary Performs a direct find operation using a Mango query object.
   * This method allows for complex queries beyond the standard CRUD operations.
   * @template V - The return type
   * @param {MangoQuery} rawInput - The Mango query to execute
   * @param {boolean} [process=true] - Whether to process the response (true returns just docs, false returns full response)
   * @return {Promise<V>} A promise that resolves to the query results
   * @mermaid
   * sequenceDiagram
   *   participant Client
   *   participant PouchAdapter
   *   participant PouchDB
   *   
   *   Client->>PouchAdapter: raw<V>(rawInput, process)
   *   PouchAdapter->>PouchDB: find(rawInput)
   *   alt Success
   *     PouchDB-->>PouchAdapter: FindResponse
   *     alt process=true
   *       PouchAdapter-->>Client: response.docs as V
   *     else process=false
   *       PouchAdapter-->>Client: response as V
   *     end
   *   else Error
   *     PouchDB-->>PouchAdapter: Error
   *     PouchAdapter->>PouchAdapter: parseError(e)
   *     PouchAdapter-->>Client: Throws error
   *   end
   */
  async raw<V>(rawInput: MangoQuery, process = true): Promise<V> {
    try {
      const response: FindResponse<any> = await this.native.find(
        rawInput as any
      );
      if (response.warning) console.warn(response.warning);
      if (process) return response.docs as V;
      return response as V;
    } catch (e: any) {
      throw PouchAdapter.parseError(e);
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
  override parseError(err: Error | string, reason?: string): BaseError {
    return PouchAdapter.parseError(err, reason);
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
   *   else err has status
   *     alt status is 401, 412, 409
   *       PouchAdapter-->>Caller: ConflictError
   *     else status is 404
   *       PouchAdapter-->>Caller: NotFoundError
   *     else status is 400
   *       alt message contains "No index exists"
   *         PouchAdapter-->>Caller: IndexError
   *       else
   *         PouchAdapter-->>Caller: InternalError
   *       end
   *     else message contains "ECONNREFUSED"
   *       PouchAdapter-->>Caller: ConnectionError
   *     else
   *       PouchAdapter-->>Caller: InternalError
   *     end
   *   end
   */
  static override parseError(err: Error | string, reason?: string): BaseError {
    // return super.parseError(err, reason);
    if (err instanceof BaseError) return err as any;
    let code: string = "";
    if (typeof err === "string") {
      code = err;
      if (code.match(/already exist|update conflict/g))
        return new ConflictError(code);
      if (code.match(/missing|deleted/g)) return new NotFoundError(code);
    } else if ((err as any).status) {
      code = (err as any).status;
      reason = reason || err.message;
    } else {
      code = err.message;
    }

    switch (code.toString()) {
      case "401":
      case "412":
      case "409":
        return new ConflictError(reason as string);
      case "404":
        return new NotFoundError(reason as string);
      case "400":
        if (code.toString().match(/No\sindex\sexists/g))
          return new IndexError(err);
        return new InternalError(err);
      default:
        if (code.toString().match(/ECONNREFUSED/g))
          return new ConnectionError(err);
        return new InternalError(err);
    }
  }

  /**
   * @description Sets up decorations for PouchDB-specific model properties
   * @summary Configures decorators for createdBy and updatedBy fields in models.
   * This method defines how these fields should be automatically populated during create and update operations.
   * @mermaid
   * sequenceDiagram
   *   participant Caller
   *   participant PouchAdapter
   *   participant Decoration
   *   
   *   Caller->>PouchAdapter: decoration()
   *   PouchAdapter->>Repository: key(PersistenceKeys.CREATED_BY)
   *   Repository-->>PouchAdapter: createdByKey
   *   PouchAdapter->>Repository: key(PersistenceKeys.UPDATED_BY)
   *   Repository-->>PouchAdapter: updatedByKey
   *   
   *   PouchAdapter->>Decoration: flavouredAs(PouchFlavour)
   *   Decoration-->>PouchAdapter: DecoratorBuilder
   *   PouchAdapter->>Decoration: for(createdByKey)
   *   PouchAdapter->>Decoration: define(onCreate, propMetadata)
   *   PouchAdapter->>Decoration: apply()
   *   
   *   PouchAdapter->>Decoration: flavouredAs(PouchFlavour)
   *   Decoration-->>PouchAdapter: DecoratorBuilder
   *   PouchAdapter->>Decoration: for(updatedByKey)
   *   PouchAdapter->>Decoration: define(onCreate, propMetadata)
   *   PouchAdapter->>Decoration: apply()
   */
  static decoration() {
    const createdByKey = Repository.key(PersistenceKeys.CREATED_BY);
    const updatedByKey = Repository.key(PersistenceKeys.UPDATED_BY);
    Decoration.flavouredAs(PouchFlavour)
      .for(createdByKey)
      .define(
        onCreate(createdByOnPouchCreateUpdate),
        propMetadata(createdByKey, {})
      )
      .apply();
    Decoration.flavouredAs(PouchFlavour)
      .for(updatedByKey)
      .define(
        onCreate(createdByOnPouchCreateUpdate),
        propMetadata(updatedByKey, {})
      )
      .apply();
  }
}
