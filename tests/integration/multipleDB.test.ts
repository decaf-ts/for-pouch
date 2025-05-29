import {
  BaseModel,
  Condition,
  index,
  OrderDirection,
  pk,
  Repository,
  uses,
} from "@decaf-ts/core";
import {
  min,
  minlength,
  Model,
  model,
  ModelArg,
  required,
  type,
} from "@decaf-ts/decorator-validation";
import { ServerScope } from "nano";
import {
  ConflictError,
  InternalError,
  readonly,
} from "@decaf-ts/db-decorators";
import { NanoAdapter } from "@decaf-ts/for-nano";
import { PouchAdapter, PouchRepository } from "../../src";
import { getHttpPouch, normalizeImport, setupBasicPouch } from "../pouch";

const admin = "admin";
const admin_password = "admin";
const user = "admin";
const user_password = "admin";
const dbName = "queries_db";
const dbHost1 = "localhost:10010";
const dbHost2 = "localhost:10011";

Model.setBuilder(Model.fromModel);

jest.setTimeout(50000);

describe("Adapter Integration", () => {
  let con1: ServerScope;
  let con2: ServerScope;
  let adapter1: PouchAdapter;
  let adapter2: PouchAdapter;

  let models: TestUser[];

  beforeAll(async () => {

    const PouchDB = await setupBasicPouch();
    const pouchHttp = await normalizeImport(import("pouchdb-adapter-http"));
    PouchDB.plugin(pouchHttp);    

    // DB 1
    con1 = await NanoAdapter.connect(admin, admin_password, dbHost1);
    expect(con1).toBeDefined();
    try {
      await NanoAdapter.createDatabase(con1, dbName);
    } catch (e: any) {
      if (!(e instanceof ConflictError)) throw e;
    }
    
    const db1 = new PouchDB(`http://${user}:${user_password}@${dbHost1}/${dbName}`);
    adapter1 = new PouchAdapter(db1,"db1");

    //DB 2
    con2 = await NanoAdapter.connect(admin, admin_password, dbHost2);
    expect(con2).toBeDefined();
    try {
      await NanoAdapter.createDatabase(con2, dbName);
    } catch (e: any) {
      if (!(e instanceof ConflictError)) throw e;
    }
    const db2 = new PouchDB(`http://${user}:${user_password}@${dbHost2}/${dbName}`);
    adapter2 = new PouchAdapter(db2,"db2");

    models = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(
      (i) =>
        new TestUser({
          age: Math.floor(18 + (i - 1) / 3),
          name: "user_name_" + i,
          sex: i % 2 === 0 ? "M" : "F",
        })
    );

});

  afterAll(async () => {
    await NanoAdapter.deleteDatabase(con1, dbName);
    await NanoAdapter.deleteDatabase(con2, dbName);
  });

  @uses("pouch")
  @model()
  class TestUser extends BaseModel {
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
    @readonly()
    @type([String.name])
    sex!: "M" | "F";

    constructor(arg?: ModelArg<TestUser>) {
      super(arg);
    }
  }

  it("Create and read Models on multiple DBs", async () => {
    const repo1 = Repository.forModel<TestUser, PouchRepository<TestUser>>(
      TestUser, "db1"
    );
    const user1 = await repo1.create(models[0]);
    expect(!user1.hasErrors()).toEqual(true);

    const repo2 = Repository.forModel<TestUser, PouchRepository<TestUser>>(
      TestUser, "db2"
    );
    const user2 = await repo2.create(models[1]);

    const user1read = await repo1.read(user1.id);
    const user2read = await repo2.read(user2.id);

    expect(user1).toEqual(user1read);
    expect(user2).toEqual(user2read);
  });

//   it("Performs simple queries - attributes only", async () => {
//     const repo = Repository.forModel<TestUser, PouchRepository<TestUser>>(
//       TestUser
//     );
//     const selected = await repo
//       .select(["age", "sex"])
//       .execute<{ age: number; sex: "M" | "F" }[]>();
//     expect(selected).toEqual(
//       expect.arrayContaining(
//         // eslint-disable-next-line @typescript-eslint/no-unused-vars
//         [...new Array(created.length)].map((e) =>
//           expect.objectContaining({
//             age: expect.any(Number),
//             sex: expect.stringMatching(/^M|F$/g),
//           })
//         )
//       )
//     );
//   });

//   it("Performs conditional queries - full object", async () => {
//     const repo = Repository.forModel<TestUser, PouchRepository<TestUser>>(
//       TestUser
//     );
//     const condition = Condition.attribute("age").eq(20);
//     const selected = await repo.select().where(condition).execute<TestUser[]>();
//     expect(selected.length).toEqual(created.filter((c) => c.age === 20).length);
//   });

//   it("Performs conditional queries - selected attributes", async () => {
//     const repo = Repository.forModel<TestUser, PouchRepository<TestUser>>(
//       TestUser
//     );
//     const condition = Condition.attribute("age").eq(20);
//     const selected = await repo
//       .select(["age", "sex"])
//       .where(condition)
//       .execute<TestUser[]>();
//     expect(selected.length).toEqual(created.filter((c) => c.age === 20).length);
//     expect(selected).toEqual(
//       expect.arrayContaining(
//         // eslint-disable-next-line @typescript-eslint/no-unused-vars
//         [...new Array(created.length)].map((e: any) =>
//           expect.objectContaining({
//             age: expect.any(Number),
//             sex: expect.stringMatching(/^M|F$/g),
//           })
//         )
//       )
//     );
//   });

//   it("Performs AND conditional queries - full object", async () => {
//     const repo = Repository.forModel<TestUser, PouchRepository<TestUser>>(
//       TestUser
//     );
//     const condition = Condition.attribute("age")
//       .eq(20)
//       .and(Condition.attribute("sex").eq("M"));
//     const selected = await repo.select().where(condition).execute<TestUser[]>();
//     expect(selected.length).toEqual(
//       created.filter((c) => c.age === 20 && c.sex === "M").length
//     );
//   });

//   it("Performs OR conditional queries - full object", async () => {
//     const repo = Repository.forModel<TestUser, PouchRepository<TestUser>>(
//       TestUser
//     );
//     const condition = Condition.attribute("age")
//       .eq(20)
//       .or(Condition.attribute("age").eq(19));
//     const selected = await repo.select().where(condition).execute<TestUser[]>();
//     expect(selected.length).toEqual(
//       created.filter((c) => c.age === 20 || c.age === 19).length
//     );
//   });

//   it("fails to Sorts attribute without indexes", async () => {
//     const repo = Repository.forModel<TestUser, PouchRepository<TestUser>>(
//       TestUser
//     );
//     await expect(() =>
//       repo.select().orderBy(["name", OrderDirection.DSC]).execute<TestUser[]>()
//     ).rejects.toThrow(InternalError);
//   });

//   it("Sorts attribute when indexed", async () => {
//     await adapter.initialize();
//     const repo = Repository.forModel<TestUser, PouchRepository<TestUser>>(
//       TestUser
//     );
//     const sorted = await repo
//       .select()
//       .orderBy(["age", OrderDirection.DSC])
//       .execute<TestUser[]>();
//     expect(sorted).toBeDefined();
//     expect(sorted.length).toEqual(created.length);

//     expect(sorted[sorted.length - 1]).toEqual(
//       expect.objectContaining(created[0])
//     );

//     expect(
//       sorted.reverse().every((s: any, i: number) => s.equals(created[i]))
//     ).toEqual(true);
//   });
});
