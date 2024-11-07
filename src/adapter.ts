import "reflect-metadata";
import {
  CouchDBAdapter,
  CouchDBKeys,
  DocumentBulkResponse,
  DocumentScope,
  IndexError,
} from "@decaf-ts/for-couchdb";
import {
  BaseError,
  ConflictError,
  InternalError,
  NotFoundError,
} from "@decaf-ts/db-decorators";
import { ConnectionError, PersistenceKeys, User } from "@decaf-ts/core";

export class PouchAdapter extends CouchDBAdapter {
  constructor(scope: DocumentScope<any>, flavour: string = "pouch") {
    super(scope, flavour);
  }

  async user(): Promise<User> {
    const url = (this.native.server as unknown as { name: string }).name;
    if (url) {
      const regexp = /https?:\/\/(.+?):.+?@/g;
      const m = regexp.exec(url);
      if (m) {
        return new User({
          id: m[1],
        });
      }
    }
    throw new InternalError("Not implemented");
  }

  async readAll(
    tableName: string,
    ids: (string | number | bigint)[]
  ): Promise<Record<string, any>[]> {
    const results = await this.native.fetch(
      { keys: ids.map((id) => this.generateId(tableName, id as any)) },
      {}
    );
    return results.rows.map((r) => {
      if (r instanceof Error) throw r;
      const res = Object.assign({}, r);
      Object.defineProperty(res, PersistenceKeys.METADATA, {
        enumerable: false,
        writable: false,
        value: (r as any)[CouchDBKeys.REV],
      });
      return res;
    });
  }

  async deleteAll(
    tableName: string,
    ids: (string | number | bigint)[]
  ): Promise<Record<string, any>[]> {
    const results = await this.native.fetch(
      { keys: ids.map((id) => this.generateId(tableName, id as any)) },
      {}
    );
    const deletion: DocumentBulkResponse[] = await this.native.bulk({
      docs: results.rows.map((r) => {
        (r as any)[CouchDBKeys.DELETED] = true;
        return r;
      }),
    });
    deletion.forEach((d: DocumentBulkResponse) => {
      if (d.error) console.error(d.error);
    });
    return results.rows.map((r) => {
      if (r instanceof Error) throw r;
      const res = Object.assign({}, r);
      Object.defineProperty(res, PersistenceKeys.METADATA, {
        enumerable: false,
        writable: false,
        value: (r as any)[CouchDBKeys.REV],
      });
      return res;
    });
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
}
