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

export async function createdByOnPouchCreateUpdate<
  M extends Model,
  R extends PouchRepository<M>,
  V extends RelationsMetadata,
  F extends PouchFlags,
  C extends Context<F>,
>(this: R, context: C, data: V, key: keyof M, model: M): Promise<void> {
  const url = (this.adapter.native as unknown as { name: string }).name;
  if (url) {
    const regexp = /https?:\/\/(.+?):.+?@/g;
    const m = regexp.exec(url);
    if (m) model[key] = m[1] as M[keyof M];
    return;
  }

  const uuid: string = context.get("UUID");
  if (!uuid)
    throw new UnsupportedError(
      "This adapter does not support user identification"
    );
  model[key] = uuid as M[keyof M];
}

export class PouchAdapter extends CouchDBAdapter<
  Database,
  PouchFlags,
  Context<PouchFlags>
> {
  constructor(scope: Database, flavour: string = "pouch") {
    super(scope, flavour);
  }

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

  async createAll(
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

  async readAll(
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

  async update(
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

  async updateAll(
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

  async delete(
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

  async deleteAll(
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

  parseError(err: Error | string, reason?: string): BaseError {
    return PouchAdapter.parseError(err, reason);
  }

  static parseError(err: Error | string, reason?: string): BaseError {
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
