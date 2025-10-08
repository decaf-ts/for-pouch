import { PouchAdapter } from "../../src";
import { CouchDBKeys } from "@decaf-ts/for-couchdb";

async function importMemoryPlugin() {
  const mod: any = await import("pouchdb-adapter-memory");
  return (mod.default || mod) as any;
}

describe("PouchAdapter deleteAll error aggregation (memory)", () => {
  jest.setTimeout(30000);

  it("throws InternalError when bulk delete has errors", async () => {
    const memory = await importMemoryPlugin();
    const adapter = new PouchAdapter(
      { dbName: "mem-del-errors", plugins: [memory] },
      "mem-del-errors"
    );
    const client: any = (adapter as any).client;

    // seed only one doc
    await client.put({ [CouchDBKeys.ID]: "d1", type: "t" });

    // include a missing id to provoke errors in the deletion phase
    await expect(
      adapter.deleteAll("tbl", ["d1", "no-such-id"]) as any
    ).rejects.toThrow();
  });
});
