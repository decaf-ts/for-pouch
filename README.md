![Banner](./workdocs/assets/decaf-logo.svg)

# decaf-ts / for-pouch

## Purpose at a Glance
A PouchDB-backed adapter and repository integration for the decaf-ts ecosystem. It provides a Repository implementation powered by PouchDB/CouchDB features (Mango queries, indexes, bulk ops, and relations), along with configuration types and constants to wire models to a PouchDB database (local or remote) using decorators.

![Licence](https://img.shields.io/github/license/decaf-ts/for-pouch.svg?style=plastic)
![GitHub language count](https://img.shields.io/github/languages/count/decaf-ts/for-pouch?style=plastic)
![GitHub top language](https://img.shields.io/github/languages/top/decaf-ts/for-pouch?style=plastic)

[![Build & Test](https://github.com/decaf-ts/for-pouch/actions/workflows/nodejs-build-prod.yaml/badge.svg)](https://github.com/decaf-ts/for-pouch/actions/workflows/nodejs-build-prod.yaml)
[![CodeQL](https://github.com/decaf-ts/for-pouch/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/decaf-ts/for-pouch/actions/workflows/codeql-analysis.yml)[![Snyk Analysis](https://github.com/decaf-ts/for-pouch/actions/workflows/snyk-analysis.yaml/badge.svg)](https://github.com/decaf-ts/for-pouch/actions/workflows/snyk-analysis.yaml)
[![Pages builder](https://github.com/decaf-ts/for-pouch/actions/workflows/pages.yaml/badge.svg)](https://github.com/decaf-ts/for-pouch/actions/workflows/pages.yaml)
[![.github/workflows/release-on-tag.yaml](https://github.com/decaf-ts/for-pouch/actions/workflows/release-on-tag.yaml/badge.svg?event=release)](https://github.com/decaf-ts/for-pouch/actions/workflows/release-on-tag.yaml)

![Open Issues](https://img.shields.io/github/issues/decaf-ts/for-pouch.svg)
![Closed Issues](https://img.shields.io/github/issues-closed/decaf-ts/for-pouch.svg)
![Pull Requests](https://img.shields.io/github/issues-pr-closed/decaf-ts/for-pouch.svg)
![Maintained](https://img.shields.io/badge/Maintained%3F-yes-green.svg)

![Forks](https://img.shields.io/github/forks/decaf-ts/for-pouch.svg)
![Stars](https://img.shields.io/github/stars/decaf-ts/for-pouch.svg)
![Watchers](https://img.shields.io/github/watchers/decaf-ts/for-pouch.svg)

![Node Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2Fbadges%2Fshields%2Fmaster%2Fpackage.json&label=Node&query=$.engines.node&colorB=blue)
![NPM Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2Fbadges%2Fshields%2Fmaster%2Fpackage.json&label=NPM&query=$.engines.npm&colorB=purple)

Documentation available [here](https://decaf-ts.github.io/for-pouch/)

Minimal size: 1.8 KB kb gzipped


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


# How to Use decaf-ts / for-pouch

Below are practical, valid TypeScript examples based on the repository’s tests. They cover the exported APIs of this package without duplication.

## 1) Install and Initialize a PouchAdapter

You can work with a local/in-memory database (useful for tests) or a remote CouchDB-compatible server.

```ts
import { PouchAdapter, DefaultLocalStoragePath, VERSION } from "@decaf-ts/for-pouch";

// Example: Local (in-memory) PouchDB using the memory adapter plugin
async function makeMemoryAdapter() {
  const memory = (await import("pouchdb-adapter-memory")).default as any;
  // Alias allows multiple DBs; useful in multi-tenant scenarios
  const adapter = new PouchAdapter({ dbName: "local_mem_db", plugins: [memory] }, "mem-local");
  // Accessing the client verifies plugins and initializes the PouchDB instance
  const client: any = (adapter as any).client;
  return adapter;
}

// Example: Remote CouchDB-compatible server
async function makeRemoteAdapter() {
  const adapter = new PouchAdapter(
    {
      protocol: "http",
      host: "localhost:5984",
      user: "admin",
      password: "secret",
      dbName: "my_database",
      plugins: [],
    },
    "remote-1"
  );
  return adapter;
}

console.log("for-pouch version:", VERSION);
```

## 2) Model Definition with Decorators

Use decaf-ts decorators to define your schema, indexes, and target flavour. The @uses("pouch") decorator ties the model to this adapter flavour.

```ts
import {
  BaseModel,
  Repository,
  OrderDirection,
  pk,
  index,
  uses,
} from "@decaf-ts/core";
import {
  Model,
  model,
  required,
  minlength,
  min,
  type,
  ModelArg,
} from "@decaf-ts/decorator-validation";

@uses("pouch")
@model()
class User extends BaseModel {
  @pk({ type: "Number" })
  id!: number;

  @required()
  @min(18)
  @index([OrderDirection.DSC, OrderDirection.ASC])
  age!: number;

  @required()
  @minlength(5)
  name!: string;

  @required()
  @type([String.name])
  sex!: "M" | "F";

  constructor(arg?: ModelArg<User>) {
    super(arg);
  }
}

Model.setBuilder(Model.fromModel);
```

## 3) Basic CRUD with Repository and PouchAdapter

```ts
import { Repository } from "@decaf-ts/core";
import { PouchAdapter } from "@decaf-ts/for-pouch";

async function crudExample(adapter: PouchAdapter) {
  const repo = new Repository(adapter, User);

  // Create
  const created = await repo.create(
    new User({ name: "user_name_1", age: 20, sex: "M" })
  );

  // Read
  const read = await repo.read(created.id);

  // Update
  const updated = await repo.update(new User({ ...created, name: "new_name" }));

  // Delete
  const deleted = await repo.delete(created.id);

  return { created, read, updated, deleted };
}
```

## 4) Bulk Operations (createAll, readAll, updateAll, deleteAll)

```ts
async function bulkExample(adapter: PouchAdapter) {
  const repo = new Repository(adapter, User);

  // Create many
  const models = Array.from({ length: 5 }, (_, i) =>
    new User({ name: `user_${i + 1}`.padEnd(6, "_"), age: 18 + i, sex: i % 2 ? "F" : "M" })
  );
  const created = await repo.createAll(models);

  // Read many by id
  const ids = created.map((u) => u.id);
  const many = await repo.readAll(ids);

  // Update many
  const updated = await repo.updateAll(
    many.map((u) => new User({ ...u, name: u.name + "_x" }))
  );

  // Delete many
  const deleted = await repo.deleteAll(updated.map((u) => u.id));
  return { created, many, updated, deleted };
}
```

Notes:
- Bulk methods aggregate item-level errors; if any operation fails, an error mapped via parseError is thrown.

## 5) Querying with select(), where(), and orderBy()

```ts
import { Condition, OrderDirection } from "@decaf-ts/core";

async function queryExample(adapter: PouchAdapter) {
  const repo = new Repository(adapter, User);

  // Insert sample data
  await repo.createAll(
    [1, 2, 3, 4, 5].map((i) => new User({ name: `user_name_${i}`, age: 18 + i % 3, sex: i % 2 ? "F" : "M" }))
  );

  // Fetch full objects
  const all = await repo.select().execute();

  // Fetch only selected attributes
  const projected = await repo.select(["age", "sex"]).execute();

  // Conditional filtering
  const cond = Condition.attribute<User>("age").eq(20);
  const exactly20 = await repo.select().where(cond).execute();

  // Sorting requires proper indexes (use adapter.initialize() to build from @index decorators)
  await adapter.initialize();
  const sorted = await repo.select().orderBy(["age", OrderDirection.DSC]).execute();

  return { all, projected, exactly20, sorted };
}
```

## 6) Pagination

```ts
import { Paginator } from "@decaf-ts/core";

async function paginationExample(adapter: PouchAdapter) {
  const repo = new Repository(adapter, User);

  await adapter.initialize();
  const paginator: Paginator<User, any> = await repo
    .select()
    .orderBy(["id", OrderDirection.DSC])
    .paginate(10);

  const page1 = await paginator.page();
  const page2 = await paginator.next();
  return { page1, page2 };
}
```

## 7) Multiple Databases via Alias

```ts
import { Repository } from "@decaf-ts/core";
import { PouchAdapter } from "@decaf-ts/for-pouch";

async function multiDbExample() {
  const memory = (await import("pouchdb-adapter-memory")).default as any;

  // Two adapters with distinct aliases
  const db1 = new PouchAdapter({ dbName: "db1", plugins: [memory] }, "db1");
  const db2 = new PouchAdapter({ dbName: "db2", plugins: [memory] }, "db2");

  // Repository.forModel can resolve by alias (after @uses("pouch") on the model)
  const repo1 = Repository.forModel(User, "db1");
  const repo2 = Repository.forModel(User, "db2");

  const u1 = await repo1.create(new User({ name: "A_user", age: 21, sex: "M" }));
  const u2 = await repo2.create(new User({ name: "B_user", age: 22, sex: "F" }));

  const again1 = await repo1.read(u1.id);
  const again2 = await repo2.read(u2.id);
  return { again1, again2 };
}
```

## 8) Using raw() for Advanced Mango Queries

```ts
import { CouchDBKeys } from "@decaf-ts/for-couchdb";

async function rawExample(adapter: PouchAdapter) {
  const client: any = (adapter as any).client;
  await client.put({ [CouchDBKeys.ID]: "r1", type: "row", x: 1 });
  await client.put({ [CouchDBKeys.ID]: "r2", type: "row", x: 2 });

  // process=true -> returns docs array only
  const docsOnly = await adapter.raw<any[]>({ selector: { type: { $eq: "row" } } }, true);

  // process=false -> returns the full FindResponse
  const full = await adapter.raw<any>({ selector: { type: { $eq: "row" } } }, false);

  return { docsOnly, full };
}
```

## 9) Error Handling with parseError

```ts
import { BaseError } from "@decaf-ts/db-decorators";
import { PouchAdapter } from "@decaf-ts/for-pouch";

async function parseErrorExample(adapter: PouchAdapter) {
  try {
    await adapter.read("tbl", "no-such-id");
  } catch (e) {
    // Convert low-level errors to decaf-ts BaseError shape
    const parsed = PouchAdapter.parseError(e);
    if (parsed instanceof BaseError) {
      // handle known error types (ConflictError, NotFoundError, etc.)
      console.warn("Handled decaf error:", parsed.message);
    } else {
      throw e;
    }
  }
}
```

## 10) createdBy/updatedBy Handling via Context Flags

The module registers a handler that copies a context UUID into the createdBy/updatedBy fields for the pouch flavour. In advanced cases you can call the handler directly, as shown in tests.

```ts
import { createdByOnPouchCreateUpdate, PouchFlags } from "@decaf-ts/for-pouch";
import { Context } from "@decaf-ts/db-decorators";

class ExampleModel { createdBy?: string }

async function createdByExample() {
  const ctx = new Context<PouchFlags>().accumulate({ UUID: "user-123" });
  const model = new ExampleModel();
  await createdByOnPouchCreateUpdate.call(
    {} as any,
    ctx,
    {} as any,
    "createdBy" as any,
    model as any
  );
  // model.createdBy === "user-123"
  return model;
}
```

## 11) Types and Constants

```ts
import type { PouchConfig, PouchFlags } from "@decaf-ts/for-pouch";
import { PouchFlavour, DefaultLocalStoragePath } from "@decaf-ts/for-pouch";

const flavour: string = PouchFlavour; // "pouch"
const defaultPath: string = DefaultLocalStoragePath; // "local_dbs"

const cfg: PouchConfig = {
  dbName: "sample",
  plugins: [],
};

const flags: PouchFlags = {
  UUID: "user-xyz",
};
```


## Coding Principles

- group similar functionality in folders (analog to namespaces but without any namespace declaration)
- one class per file;
- one interface per file (unless interface is just used as a type);
- group types as other interfaces in a types.ts file per folder;
- group constants or enums in a constants.ts file per folder;
- group decorators in a decorators.ts file per folder;
- always import from the specific file, never from a folder or index file (exceptions for dependencies on other packages);
- prefer the usage of established design patters where applicable:
  - Singleton (can be an anti-pattern. use with care);
  - factory;
  - observer;
  - strategy;
  - builder;
  - etc;


### Related

[![decaf-ts](https://github-readme-stats.vercel.app/api/pin/?username=decaf-ts&repo=decaf-ts)](https://github.com/decaf-ts/decaf-ts)
[![for nano](https://github-readme-stats.vercel.app/api/pin/?username=decaf-ts&repo=for-pouch)](https://github.com/decaf-ts/for-nano)
[![for couch](https://github-readme-stats.vercel.app/api/pin/?username=decaf-ts&repo=for-couchdb)](https://github.com/decaf-ts/for-couchdb)
[![core](https://github-readme-stats.vercel.app/api/pin/?username=decaf-ts&repo=core)](https://github.com/decaf-ts/core)
[![decorator-validation](https://github-readme-stats.vercel.app/api/pin/?username=decaf-ts&repo=decorator-validation)](https://github.com/decaf-ts/decorator-validation)
[![db-decorators](https://github-readme-stats.vercel.app/api/pin/?username=decaf-ts&repo=db-decorators)](https://github.com/decaf-ts/db-decorators)


### Social

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/decaf-ts/)




#### Languages

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![NodeJS](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![ShellScript](https://img.shields.io/badge/Shell_Script-121011?style=for-the-badge&logo=gnu-bash&logoColor=white)

## Getting help

If you have bug reports, questions or suggestions please [create a new issue](https://github.com/decaf-ts/ts-workspace/issues/new/choose).

## Contributing

I am grateful for any contributions made to this project. Please read [this](./workdocs/98-Contributing.md) to get started.

## Supporting

The first and easiest way you can support it is by [Contributing](./workdocs/98-Contributing.md). Even just finding a typo in the documentation is important.

Financial support is always welcome and helps keep both me and the project alive and healthy.

So if you can, if this project in any way. either by learning something or simply by helping you save precious time, please consider donating.

## License

This project is released under the [Mozilla Public License 2.0](./LICENSE.md).

By developers, for developers...
