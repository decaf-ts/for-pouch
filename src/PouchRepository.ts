import { Model } from "@decaf-ts/decorator-validation";
import { MangoQuery } from "@decaf-ts/for-couchdb";
import { Repository } from "@decaf-ts/core";
import { PouchAdapter } from "./adapter";

export type PouchRepository<M extends Model> = Repository<
  M,
  MangoQuery,
  PouchAdapter
>;
