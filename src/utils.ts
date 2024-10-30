import Database = PouchDB.Database;
import {
  BulkModifyDocsWrapper,
  CreateIndexRequest,
  CreateIndexResponse,
  DatabaseAuthResponse,
  DatabaseSessionResponse,
  DocumentDestroyResponse,
  DocumentGetParams,
  DocumentInsertResponse,
  DocumentScope,
  MangoQuery,
  MangoResponse,
  ServerScope,
} from "@decaf-ts/for-couchdb";
import FindRequest = PouchDB.Find.FindRequest;

export function toServerScope(pouch: typeof PouchDB) {
  return new (class implements ServerScope {
    constructor(private pouch: typeof PouchDB) {}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    use<D>(db: string): DocumentScope<D> {
      throw new Error("Method not implemented.");
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    auth(username: string, userpass: string): Promise<DatabaseAuthResponse> {
      throw new Error("Method not implemented.");
    }
    session(): Promise<DatabaseSessionResponse> {
      throw new Error("Method not implemented.");
    }
  })(pouch);
}

export function toDocumentScope(database: Database) {
  return new (class implements DocumentScope<any> {
    constructor(private db: Database) {}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    auth(username: string, userpass: string): Promise<DatabaseAuthResponse> {
      throw new Error("Method not implemented.");
    }
    session(): Promise<DatabaseSessionResponse> {
      throw new Error("Method not implemented.");
    }
    async insert(document: any): Promise<DocumentInsertResponse> {
      return this.db.put(document);
    }
    get(docname: string, params?: DocumentGetParams | undefined): Promise<any> {
      return this.db.get(docname, params);
    }
    destroy(docname: string, rev: string): Promise<DocumentDestroyResponse> {
      return this.db.remove({ _id: docname, _rev: rev });
    }
    async bulk(docs: BulkModifyDocsWrapper): Promise<DocumentInsertResponse[]> {
      const results = await this.db.allDocs({ keys: docs.docs });
      return results.rows as any;
    }
    async createIndex(
      indexDef: CreateIndexRequest
    ): Promise<CreateIndexResponse> {
      const result = await this.db.createIndex(indexDef as any);
      return {
        result: result.result,
        id: indexDef.ddoc as string,
        name: indexDef.name as string,
      };
    }
    find(query: MangoQuery): Promise<MangoResponse<any>> {
      return this.db.find(query as unknown as FindRequest<any>);
    }
    server: ServerScope;
  })(database);
}
