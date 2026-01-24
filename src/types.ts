import { AdapterFlags } from "@decaf-ts/core";

/**
 * @description Flags specific to PouchDB repository operations
 * @summary Extends the base repository flags with PouchDB-specific properties.
 * These flags are used to pass additional information during repository operations.
 * @interface PouchFlags
 * @memberOf module:for-pouch
 */
export interface PouchFlags extends AdapterFlags {
  /**
   * @description Unique identifier for the current user or operation
   */
  UUID: string;
}

/**
 * @description Configuration options for initializing a PouchDB adapter
 * @summary Defines connection credentials, local storage options, database name, and a list of PouchDB plugins to register before client creation.
 * @template
 * @property {string} [user] - Username for remote HTTP/S connections
 * @property {string} [password] - Password for remote HTTP/S connections
 * @property {string} [host] - Host (and optional port) of the remote CouchDB-compatible server
 * @property {("http"|"https")} [protocol] - Network protocol to use when connecting remotely
 * @property {number} [port] - Optional explicit port number; if provided may be part of host instead
 * @property {string} dbName - Database name used in the URL or local path
 * @property {string} [storagePath] - Relative base path for local databases; defaults to {@link DefaultLocalStoragePath}
 * @property {any[]} plugins - List of PouchDB plugins (modules) to register with the client
 * @typeDef PouchConfig
 * @memberOf module:for-pouch
 */
export type PouchConfig = {
  user?: string;
  password?: string;
  adminUser?: string;
  adminPassword?: string;
  host?: string;
  protocol?: "http" | "https";
  port?: number;
  dbName: string;
  storagePath?: string;
  plugins: any[];
};
