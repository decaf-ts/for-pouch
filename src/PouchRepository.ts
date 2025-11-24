import { Model } from "@decaf-ts/decorator-validation";
import { CouchDBRepository } from "@decaf-ts/for-couchdb";
import { PouchAdapter } from "./adapter";

/**
 * @description Type definition for a PouchDB repository
 * @summary A specialized repository type for working with PouchDB.
 * This type combines the generic Repository with PouchDB-specific components like MangoQuery and PouchAdapter.
 * @template M - The model type that extends Model
 * @typedef {Repository<M, MangoQuery, PouchAdapter>} PouchRepository
 * @memberOf module:for-pouch
 */
export type PouchRepository<M extends Model> = CouchDBRepository<
  M,
  PouchAdapter
>;
