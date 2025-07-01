import { Model } from "@decaf-ts/decorator-validation";
import { MangoQuery } from "@decaf-ts/for-couchdb";
import { Repository } from "@decaf-ts/core";
import { PouchAdapter } from "./adapter";

/**
 * @description Type definition for a PouchDB repository
 * @summary A specialized repository type for working with PouchDB.
 * This type combines the generic Repository with PouchDB-specific components like MangoQuery and PouchAdapter.
 * @template M - The model type that extends Model
 * @typedef {Repository<M, MangoQuery, PouchAdapter>} PouchRepository
 * @memberOf module:for-pouch
 */
export type PouchRepository<M extends Model> = Repository<
  M,
  MangoQuery,
  PouchAdapter
>;
