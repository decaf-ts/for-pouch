import { Model } from "@decaf-ts/decorator-validation";
import { MangoQuery } from "@decaf-ts/for-couchdb";
import { Adapter, Repository } from "@decaf-ts/core";
import Database = PouchDB.Database;

export type PouchRepository<M extends Model> = Repository<
  M,
  MangoQuery,
  Adapter<Database, MangoQuery>
>;
