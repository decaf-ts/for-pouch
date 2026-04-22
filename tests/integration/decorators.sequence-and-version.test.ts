import { ServerScope } from "nano";
import { Model, model, type ModelArg } from "@decaf-ts/decorator-validation";
import {
  BaseModel,
  Context,
  pk,
  sequence,
  table,
  version,
} from "@decaf-ts/core";
import { uses } from "@decaf-ts/decoration";
import {
  BulkCrudOperationKeys,
  ConflictError,
  OperationKeys,
} from "@decaf-ts/db-decorators";
import { CouchDBRepository } from "@decaf-ts/for-couchdb";
import { NanoAdapter } from "@decaf-ts/for-nano";
import { PouchAdapter } from "../../src";
import { getHttpPouch } from "../pouch";
import { PouchFlavour } from "../../src/index";

const admin = "couchdb.admin";
const admin_password = "couchdb.admin";
const user = "couchdb.admin";
const user_password = "couchdb.admin";
const dbHost = "localhost:10010";

Model.setBuilder(Model.fromModel);

jest.setTimeout(150000);

@uses(PouchFlavour)
@table("tst_persistent_version_pouch")
@model()
class PersistentVersionPouchModel extends BaseModel {
  @pk({ type: Number, generated: false })
  id!: number;

  @version(true)
  version!: number;

  constructor(arg?: ModelArg<PersistentVersionPouchModel>) {
    super(arg);
  }
}

@uses(PouchFlavour)
@table("tst_sequence_per_instance_pouch")
@model()
class SequencePerInstancePouchModel extends BaseModel {
  @pk({ type: Number, generated: false })
  id!: number;

  @sequence({ type: Number })
  step!: number;

  constructor(arg?: ModelArg<SequencePerInstancePouchModel>) {
    super(arg);
  }
}

describe("core decorators on pouch adapter", () => {
  const dbName = `decorators_seq_ver_pouch_${Date.now()}`;

  let con: ServerScope;
  let adapter: PouchAdapter;
  let versionRepo: CouchDBRepository<PersistentVersionPouchModel>;
  let seqRepo: CouchDBRepository<SequencePerInstancePouchModel>;

  beforeAll(async () => {
    con = await NanoAdapter.connect(admin, admin_password, dbHost);
    try {
      await NanoAdapter.createDatabase(con, dbName);
      await NanoAdapter.createUser(con, dbName, user, user_password);
    } catch (e: any) {
      if (!(e instanceof ConflictError)) throw e;
    }
    adapter = await getHttpPouch(dbName, user, user_password);
    await adapter.initialize();

    versionRepo = new CouchDBRepository(adapter, PersistentVersionPouchModel);
    seqRepo = new CouchDBRepository(adapter, SequencePerInstancePouchModel);
  });

  afterAll(async () => {
    await NanoAdapter.deleteDatabase(con, dbName);
  });

  it("@version(true) increments across update/delete/recreate for the same pk (and supports bulk ops)", async () => {
    const created = await versionRepo.create(
      new PersistentVersionPouchModel({ id: 1 })
    );
    expect(created.version).toBe(1);

    const updateCtx1 = await Context.from(
      OperationKeys.UPDATE,
      {},
      PersistentVersionPouchModel
    );
    const updated1 = await versionRepo.update(
      new PersistentVersionPouchModel({ ...created }),
      updateCtx1 as any
    );
    expect(updated1.version).toBe(2);

    const updateCtx2 = await Context.from(
      OperationKeys.UPDATE,
      {},
      PersistentVersionPouchModel
    );
    const updated2 = await versionRepo.update(
      new PersistentVersionPouchModel({ ...updated1 }),
      updateCtx2 as any
    );
    expect(updated2.version).toBe(3);

    await versionRepo.delete(updated2.id);

    const recreated = await versionRepo.create(
      new PersistentVersionPouchModel({ id: 1 })
    );
    expect(recreated.version).toBe(4);

    const createAllCtx = await Context.from(
      BulkCrudOperationKeys.CREATE_ALL,
      {},
      PersistentVersionPouchModel
    );
    const updateAllCtx = await Context.from(
      BulkCrudOperationKeys.UPDATE_ALL,
      {},
      PersistentVersionPouchModel
    );

    const bulkCreated = await versionRepo.createAll(
      [
        new PersistentVersionPouchModel({ id: 10 }),
        new PersistentVersionPouchModel({ id: 11 }),
      ],
      createAllCtx as any
    );
    expect(bulkCreated.map((m) => m.version)).toEqual([1, 1]);

    const bulkUpdated = await versionRepo.updateAll(
      bulkCreated.map((m) => new PersistentVersionPouchModel({ ...m })),
      updateAllCtx as any
    );
    expect(bulkUpdated.map((m) => m.version)).toEqual([2, 2]);

    await versionRepo.deleteAll([10, 11]);

    const bulkRecreated = await versionRepo.createAll(
      [
        new PersistentVersionPouchModel({ id: 10 }),
        new PersistentVersionPouchModel({ id: 11 }),
      ],
      createAllCtx as any
    );
    expect(bulkRecreated.map((m) => m.version)).toEqual([3, 3]);

    await versionRepo.deleteAll([10, 11]);
  });

  it("@sequence() is per-model-instance (pk + property), not global per class", async () => {
    let a = await seqRepo.create(new SequencePerInstancePouchModel({ id: 1 }));
    let b = await seqRepo.create(new SequencePerInstancePouchModel({ id: 2 }));

    expect(a.step).toBe(1);
    expect(b.step).toBe(1);

    await seqRepo.delete(1);
    b = await seqRepo.update(new SequencePerInstancePouchModel({ ...b }));
    expect(b.step).toBe(1);

    a = await seqRepo.create(new SequencePerInstancePouchModel({ id: 1 }));
    expect(a.step).toBe(2);
  });

  it("@sequence() seeds from provided value when sequence does not exist, and continues after delete + recreate", async () => {
    const seedCtx = await Context.from(
      OperationKeys.CREATE,
      { allowGenerationOverride: true } as any,
      SequencePerInstancePouchModel
    );
    const seeded = await seqRepo.create(
      new SequencePerInstancePouchModel({ id: 99, step: 10 }),
      seedCtx as any
    );
    expect(seeded.step).toBe(10);

    await seqRepo.delete(99);

    const next = await seqRepo.create(
      new SequencePerInstancePouchModel({ id: 99 })
    );
    expect(next.step).toBe(11);
  });
});
