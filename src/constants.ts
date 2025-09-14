/**
 * @description Identifier for PouchDB flavor in the decorator system
 * @summary A string constant that identifies the PouchDB implementation in the decorator system.
 * This is used to target decorators specifically for PouchDB adapters.
 * @const PouchFlavour
 * @memberOf module:for-pouch
 */
export const PouchFlavour = "pouch";

/**
 * @description Default relative path where local PouchDB databases are stored
 * @summary Used when creating a local PouchDB instance without a remote host; combined with dbName to form the filesystem path.
 * @const DefaultLocalStoragePath
 * @memberOf module:for-pouch
 */
export const DefaultLocalStoragePath = "local_dbs";
