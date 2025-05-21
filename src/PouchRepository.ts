import { Model } from "@decaf-ts/decorator-validation";
import { MangoQuery } from "@decaf-ts/for-couchdb";
import { Adapter, Repository } from "@decaf-ts/core";
import Database = PouchDB.Database;
import { PouchFlags } from "./types";
import { Context } from "@decaf-ts/db-decorators";

export type PouchRepository<M extends Model> = Repository<
  M,
  MangoQuery,
  Adapter<Database, MangoQuery, PouchFlags, Context<PouchFlags>>
>;
