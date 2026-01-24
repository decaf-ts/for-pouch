import { Model } from "@decaf-ts/decorator-validation";
import { CouchDBRepository } from "@decaf-ts/for-couchdb";
import { ContextOf, FlagsOf } from "@decaf-ts/core";
import { Constructor } from "@decaf-ts/decoration";
import { PouchAdapter } from "./adapter";

/**
 * @description Repository implementation for PouchDB-backed models
 * @summary Extends the CouchDBRepository with PouchAdapter-specific overrides so the repository can be proxied with the correct flags.
 * @template M - Model type managed by this repository
 * @memberOf module:for-pouch
 */
export class PouchRepository<M extends Model> extends CouchDBRepository<
  M,
  PouchAdapter
> {
  constructor(adapter: PouchAdapter, model: Constructor<M>) {
    super(adapter, model);
  }

  override override(
    flags: Partial<FlagsOf<ContextOf<PouchAdapter>>>
  ): this {
    return super.override(flags).for(flags as unknown as never);
  }
}
