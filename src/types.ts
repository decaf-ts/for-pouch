import { RepositoryFlags } from "@decaf-ts/db-decorators";

/**
 * @description Flags specific to PouchDB repository operations
 * @summary Extends the base repository flags with PouchDB-specific properties.
 * These flags are used to pass additional information during repository operations.
 * @interface PouchFlags
 * @memberOf module:for-pouch
 */
export interface PouchFlags extends RepositoryFlags {
  /**
   * @description Unique identifier for the current user or operation
   */
  UUID: string;
}
