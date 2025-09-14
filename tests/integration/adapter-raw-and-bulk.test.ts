import { PouchAdapter } from "../../src";
import { NanoAdapter } from "@decaf-ts/for-nano";
import { ConflictError } from "@decaf-ts/db-decorators";
import { CouchDBKeys } from "@decaf-ts/for-couchdb";
import type { ServerScope } from "nano";
import { getHttpPouch } from "../pouch";

const admin = "couchdb.admin";
const admin_password = "couchdb.admin";
const user = "couchdb.admin";
const user_password = "couchdb.admin";
const dbName = "adapter_raw_bulk_db";
const dbHost = "localhost:10010";

describe("PouchAdapter raw() and bulk edge cases (HTTP)", () => {
  jest.setTimeout(60000);

  let con: ServerScope;
  let adapter: PouchAdapter;

  beforeAll(async () => {
    con = await NanoAdapter.connect(admin, admin_password, dbHost);
    try {
      await NanoAdapter.createDatabase(con, dbName);
      await NanoAdapter.createUser(con, dbName, user, user_password);
    } catch (e: any) {
      if (!(e instanceof ConflictError)) throw e;
    }
    adapter = await getHttpPouch(dbName, user, user_password);
  });

  afterAll(async () => {
    await NanoAdapter.deleteDatabase(con, dbName);
  });

  it("raw() returns docs when process=true and full response when false", async () => {
    // ensure some docs exist
    const client: any = (adapter as any).client;
    await client.put({ [CouchDBKeys.ID]: "r1", type: "row", x: 1 });
    await client.put({ [CouchDBKeys.ID]: "r2", type: "row", x: 2 });

    const docs = await adapter.raw<any[]>({ selector: { type: { $eq: "row" } } }, true);
    expect(Array.isArray(docs)).toBe(true);
    expect(docs.length).toBeGreaterThanOrEqual(2);

    const full = await adapter.raw<any>({ selector: { type: { $eq: "row" } } }, false);
    expect(full).toHaveProperty("docs");
    expect(Array.isArray(full.docs)).toBe(true);
  });

  it("readAll() throws when any requested doc is missing", async () => {
    await expect(
      adapter.readAll("some_table", ["missing-id-1", "missing-id-2"]) as any
    ).rejects.toBeInstanceOf(Error);
  });

  it("updateAll() aggregates item errors from bulkDocs response", async () => {
    const client: any = (adapter as any).client;
    // create two docs first
    await client.put({ [CouchDBKeys.ID]: "u1", type: "user", a: 1 });
    await client.put({ [CouchDBKeys.ID]: "u2", type: "user", a: 2 });
    const d1 = await client.get("u1");
    const d2 = await client.get("u2");

    // corrupt rev of the second to trigger conflict in bulkDocs
    const bad = { ...d2, [CouchDBKeys.REV]: "1-badbadbad" };

    await expect(
      adapter.updateAll(
        "tbl",
        ["u1", "u2"],
        [
          { ...d1, a: 10 },
          bad,
        ]
      ) as any
    ).rejects.toBeInstanceOf(Error);
  });
});
