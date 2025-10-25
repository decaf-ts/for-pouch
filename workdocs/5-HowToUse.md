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
