import { PouchAdapter } from "../../src";
import { CouchDBKeys } from "@decaf-ts/for-couchdb";
import { BaseError } from "@decaf-ts/db-decorators";

async function importMemoryPlugin() {
  const mod: any = await import("pouchdb-adapter-memory");
  return (mod.default || mod) as any;
}

describe("PouchAdapter error paths (memory)", () => {
  jest.setTimeout(30000);

  it("create/update/delete/createAll error handling and instance parseError delegation", async () => {
    const memory = await importMemoryPlugin();
    const adapter = new PouchAdapter({ dbName: "mem-errors", plugins: [memory] }, "mem-errors");
    const client: any = (adapter as any).client;

    // seed a doc
    await client.put({ [CouchDBKeys.ID]: "dup1", type: "x" });

    // create() conflict error path (caught and parsed)
    await expect(
      adapter.create("tbl", "dup1", { [CouchDBKeys.ID]: "dup1", type: "x" }) as any
    ).rejects.toBeInstanceOf(BaseError);

    // update() stale rev error path
    const d = await client.get("dup1");
    const stale = { ...d, [CouchDBKeys.REV]: "1-deadbeef" };
    await expect(
      adapter.update("tbl", "dup1", stale as any) as any
    ).rejects.toBeInstanceOf(BaseError);

    // delete() missing id error path
    await expect(adapter.delete("tbl", "no-such-id") as any).rejects.toBeInstanceOf(BaseError);

    // createAll() with one conflict entry triggers aggregation branch
    await expect(
      adapter.createAll("tbl", ["dup1", "new2"], [
        { [CouchDBKeys.ID]: "dup1", type: "x" },
        { [CouchDBKeys.ID]: "new2", type: "y" },
      ]) as any
    ).rejects.toBeInstanceOf(BaseError);

    // instance parseError delegation
    const parsed = adapter.parseError("deleted");
    expect(parsed).toBeInstanceOf(BaseError);
  });
});
