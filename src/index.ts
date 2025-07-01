import { PouchAdapter } from "./adapter";

PouchAdapter.decoration();

export * from "./constants";
export * from "./PouchRepository";
export * from "./types";
// left to the end on purpose
export * from "./adapter";

/**
 * @description A TypeScript adapter for PouchDB integration
 * @summary This module provides a repository pattern implementation for PouchDB, allowing for easy database operations with TypeScript type safety. It exports constants, repository classes, types, and adapters for working with PouchDB.
 * @module for-pouch
 */

/**
 * @description Package version identifier
 * @summary Stores the current version of the for-pouch package
 * @const VERSION
 * @memberOf module:for-pouch
 */
export const VERSION = "##VERSION##";
