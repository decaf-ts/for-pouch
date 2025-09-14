# decaf-ts / for-pouch — Detailed Description

This package integrates PouchDB with the decaf-ts data and decorator ecosystem. It provides:
- A concrete PouchAdapter that implements persistence against a PouchDB backend (local or remote CouchDB-compatible server).
- A typed PouchRepository alias for convenience when working with decaf-ts Repository and Mango queries.
- Configuration and flag types tailored for PouchDB usage.
- A module entry that wires flavour-specific decorations for createdBy/updatedBy when the module is loaded.

The intent of this library is to offer an ergonomic, type-safe repository pattern on top of PouchDB/CouchDB, including:
- CRUD operations (single and bulk) with proper error mapping.
- Query support via Mango queries, sorting with defined indexes, and pagination via core utilities.
- Support for multiple databases and aliases.
- Seamless model decoration with decaf-ts decorators, including created/updated metadata and relation handling.


API Inventory by File

1) src/constants.ts
- PouchFlavour: string = "pouch" — Flavour identifier used by the decorator system and Repository.forModel resolution.
- DefaultLocalStoragePath: string = "local_dbs" — Default path for local PouchDB storage when running without a remote host.

2) src/types.ts
- interface PouchFlags extends RepositoryFlags
  - UUID: string — a per-operation/user identifier injected in Context and used by createdBy/updatedBy decoration.
- type PouchConfig
  - user?: string — remote username.
  - password?: string — remote password.
  - host?: string — remote host.
  - protocol?: "http" | "https" — remote protocol.
  - port?: number — remote port (optional if in host).
  - dbName: string — database name.
  - storagePath?: string — base path for local databases.
  - plugins: any[] — list of PouchDB plugins to register before client creation.

3) src/PouchRepository.ts
- type PouchRepository<M extends Model> = Repository<M, MangoQuery, PouchAdapter>
  - Convenience alias that binds the decaf-ts Repository with MangoQuery and the PouchAdapter backend.

4) src/adapter.ts
- function createdByOnPouchCreateUpdate<M, R, V>(this: R, context: Context<PouchFlags>, data: V, key: keyof M, model: M): Promise<void>
  - Decorator handler: copies context UUID into the model[key]. Throws UnsupportedError when unavailable.
- class PouchAdapter extends CouchDBAdapter<PouchConfig, PouchDB.Database, PouchFlags, Context<PouchFlags>>
  - constructor(config: PouchConfig, alias?: string)
    - Initializes the adapter with configuration and optional alias.
  - getClient(): PouchDB.Database
    - Lazy client getter; registers provided plugins; creates local or remote client.
  - flags(operation, model, flags?): Context<PouchFlags>
    - Prepares operation context and attaches Pouch-specific flags when required.
  - index(models: Constructor<Model>[]): Promise<CreateIndexResponse[]>
    - Generates remote/local indexes based on @index decorators in the given models.
  - initialize(): Promise<CreateIndexResponse[]>
    - Inherited via CouchDBAdapter; here used in tests to create indexes for sorting. (Called on the adapter instance.)
  - create(tableName: string, id: Id, model: Model): Promise<Model>
  - createAll(tableName: string, ids: Id[], models: Model[]): Promise<Model[]>
  - read(tableName: string, id: Id): Promise<Model>
  - readAll(tableName: string, ids: Id[]): Promise<Model[]>
  - update(tableName: string, id: Id, model: Model): Promise<Model>
  - updateAll(tableName: string, ids: Id[], models: Model[]): Promise<Model[]>
  - delete(tableName: string, id: Id): Promise<Model>
  - deleteAll(tableName: string, ids: Id[]): Promise<Model[]>
    - Bulk variants aggregate item-level errors and throw a mapped BaseError when any failures occur.
  - raw<T = any>(rawInput: any, process: boolean): Promise<T>
    - Executes a raw Mango find request. When process=true, returns docs array; otherwise returns full find response.
  - static parseError(err: unknown): BaseError
    - Maps PouchDB/HTTP errors and messages into decaf-ts BaseError subtypes, including ConflictError/NotFoundError/ConnectionError.
    - The instance method parseError delegates to the static implementation.
  - static decoration(): void
    - Registers createdByOnPouchCreateUpdate for the pouch flavour so createdBy/updatedBy fields are managed automatically.

5) src/index.ts
- Side-effect call: PouchAdapter.decoration() — ensures flavour-specific decorator handler is registered upon import.
- Re-exports: constants, PouchRepository, types, adapter.
- VERSION: string — package version placeholder replaced at build time.


Behavioral Notes and Design Intent

- Multiple DB support: A PouchAdapter can be constructed with an alias; Repository.forModel(Model, alias) resolves the repository for that specific adapter/DB. This enables working with multiple databases concurrently.
- Decorator-driven modeling: Use @model, @pk, @index, @readonly, and other decaf-ts decorators to describe schemas and constraints. The adapter interprets indexes through @index and can generate them via initialize() or index().
- Querying: The core Repository composes Mango queries via select().where(Condition...).orderBy(...). PouchAdapter translates and executes these queries with PouchDB Find.
- Pagination: Use core Paginator returned by paginate(size) on a selection. Sorting requires proper indexes.
- Error translation: PouchAdapter.parseError normalizes errors from PouchDB/CouchDB and HTTP status codes into a stable error hierarchy for consistent handling.
- Raw access: raw() allows advanced Mango usage or debugging by running low-level queries and choosing between processed docs or the full response.
