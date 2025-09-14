import { PouchAdapter } from "../../src";
import { CouchDBKeys } from "@decaf-ts/for-couchdb";

// We rely on a real in-memory PouchDB plugin to avoid mocking
async function importMemoryPlugin() {
  const mod: any = await import("pouchdb-adapter-memory");
  return (mod.default || mod) as any;
}

describe("PouchAdapter client initialization (local/memory)", () => {
  jest.setTimeout(30000);

  it("creates a local client using memory adapter (no host/user path)", async () => {
    const memory = await importMemoryPlugin();
    const adapter = new PouchAdapter({ dbName: "local_mem_db", plugins: [memory] }, "mem-local");
    const client: any = (adapter as any).client; // access via getter to trigger getClient branch
    expect(client).toBeDefined();
    // perform a simple write/read to ensure the client is functional
    const put = await client.put({ [CouchDBKeys.ID]: "t1", type: "test" });
    expect(put.ok).toBe(true);
    const got = await client.get("t1");
    expect(got.type).toBe("test");
  });

  it("ignores duplicate plugin registration errors (redefine property)", async () => {
    const memory = await importMemoryPlugin();
    // pass same plugin twice to trigger the internal try/catch continue path
    const adapter = new PouchAdapter({ dbName: "dup_plugin_db", plugins: [memory, memory] }, "mem-dup");
    const client: any = (adapter as any).client;
    expect(client).toBeDefined();
  });

  it("throws if a non-plugin is provided (plugin registration error)", async () => {
    // @ts-expect-error intentionally wrong plugin to hit error path
    const badPlugin: any = 12345;
    const adapter = new PouchAdapter({ dbName: "bad_plugin_db", plugins: [badPlugin] }, "mem-bad");
    // accessing client triggers plugin registration
    await expect(async () => (adapter as any).client).rejects.toThrow();
  });
});
