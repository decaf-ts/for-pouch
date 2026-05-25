import { PouchAdapter } from "./adapter";
import { Metadata } from "@decaf-ts/decoration";

PouchAdapter.decoration();

export * from "./constants";
export * from "./PouchRepository";
export * from "./types";
// left to the end on purpose
export * from "./adapter";

/**
 * @description A TypeScript adapter for PouchDB integration
 * @summary Provides a repository-pattern implementation backed by PouchDB, exposing the {@link PouchAdapter} to interface with databases, the {@link PouchRepository} for typed data access, configuration {@link module:for-pouch|constants} like {@link PouchFlavour} and {@link DefaultLocalStoragePath}, and related {@link module:for-pouch|types}. This module wires up decorators on load to support created/updated-by fields.
 * @module for-pouch
 */

/**
 * @description Package version identifier
 * @summary Stores the current version of the for-pouch package
 * @const VERSION
 * @memberOf module:for-pouch
 */
export const VERSION = "##VERSION##";

/**
 * @description Represents the current commit hash of the module build.
 * @summary Stores the current git commit hash for the package. The build replaces
 * the placeholder with the actual commit hash at publish time.
 * @const COMMIT
 */
export const COMMIT = "##COMMIT##";

/**
 * @description Represents the full version string of the module.
 * @summary Stores the semver version and commit hash for the package.
 * The build replaces the placeholder with the actual `<version>-<commit>` value at publish time.
 * @const FULL_VERSION
 */
export const FULL_VERSION = "##FULL_VERSION##";


/**
 * @description Package version identifier
 * @summary Stores the current version of the for-pouch package
 * @const VERSION
 * @memberOf module:for-pouch
 */
export const PACKAGE_NAME = "##PACKAGE##";
Metadata.registerLibrary(PACKAGE_NAME, VERSION);
