import { Model } from "@decaf-ts/decorator-validation";
import { MangoQuery } from "@decaf-ts/for-couchdb";
import { PouchAdapter } from "./adapter";
import { Repository } from "@decaf-ts/core";

export interface PouchRepository<M extends Model>
  extends Repository<M, MangoQuery> {
  adapter: PouchAdapter;
}
