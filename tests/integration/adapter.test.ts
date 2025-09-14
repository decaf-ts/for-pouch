import { ServerScope } from "nano";
import { PersistenceKeys, Repository } from "@decaf-ts/core";
import { Model } from "@decaf-ts/decorator-validation";
import { TestModel } from "../TestModel";
import { ConflictError, NotFoundError } from "@decaf-ts/db-decorators";
import { NanoAdapter } from "@decaf-ts/for-nano";
import { PouchAdapter, PouchRepository } from "../../src";
import { getHttpPouch } from "../pouch";
import { Sequence } from "@decaf-ts/for-couchdb";

const admin = "couchdb.admin";
const admin_password = "couchdb.admin";
const user = "couchdb.admin";
const user_password = "couchdb.admin";
const dbName = "adapter_db";
const dbHost = "localhost:10010";

Model.setBuilder(Model.fromModel);

jest.setTimeout(50000);

describe("Adapter Integration", () => {
  let con: ServerScope;
  let adapter: PouchAdapter;
  let repo: PouchRepository<TestModel>;

  beforeAll(async () => {
    con = await NanoAdapter.connect(admin, admin_password, dbHost);
    expect(con).toBeDefined();
    try {
      await NanoAdapter.createDatabase(con, dbName);
      await NanoAdapter.createUser(con, dbName, user, user_password);
    } catch (e: any) {
      if (!(e instanceof ConflictError)) throw e;
    }
    con = NanoAdapter.connect(user, user_password, dbHost);
    adapter = await getHttpPouch(dbName, user, user_password);
    repo = new Repository(adapter, TestModel);
  });

  afterAll(async () => {
    await NanoAdapter.deleteDatabase(con, dbName);
  });

  let created: TestModel, updated: TestModel;

  it("creates a sequence", async () => {
    const sequence = new Sequence({
      id: "id" + Date.now(),
      current: Date.now(),
    });

    const repo = new Repository(adapter, Sequence);

    const created = repo.create(sequence);
    expect(created).toBeDefined();
  });

  it("creates", async () => {
    const model = new TestModel({
      id: Date.now(),
      name: "test_name",
      nif: "123456789",
    });

    created = await repo.create(model);

    expect(created).toBeDefined();
    const metadata = (created as any)[PersistenceKeys.METADATA];
    expect(metadata).toBeDefined();
  });

  it("reads", async () => {
    const read = await repo.read(created.id as number);

    expect(read).toBeDefined();
    expect(read.equals(created)).toEqual(true); // same model
    expect(read === created).toEqual(false); // different instances
    const metadata = (read as any)[PersistenceKeys.METADATA];
    expect(metadata).toBeDefined();
  });

  it("updates", async () => {
    const toUpdate = new TestModel(
      Object.assign({}, created, {
        name: "new_test_name",
      })
    );

    updated = await repo.update(toUpdate);

    expect(updated).toBeDefined();
    expect(updated.equals(created)).toEqual(false);
    expect(updated.equals(created, "updatedOn", "name")).toEqual(true); // minus the expected changes
    const metadata = (updated as any)[PersistenceKeys.METADATA];
    expect(metadata).toBeDefined();
  });

  it("deletes", async () => {
    const deleted = await repo.delete(created.id as number);
    expect(deleted).toBeDefined();
    expect(deleted.equals(updated)).toEqual(true);

    await expect(repo.read(created.id as number)).rejects.toThrowError(
      NotFoundError
    );

    const metadata = (deleted as any)[PersistenceKeys.METADATA];
    expect(metadata).toBeDefined();
  });
});
