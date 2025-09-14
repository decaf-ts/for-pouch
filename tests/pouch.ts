import { PouchAdapter } from "../src";

export async function normalizeImport<T>(
  importPromise: Promise<T>
): Promise<T> {
  // CommonJS's `module.exports` is wrapped as `default` in ESModule.
  return importPromise.then((m: any) => (m.default || m) as T);
}

const protocol = "http";
const apiEndpoint = "localhost:10010";

export async function getHttpPouch(
  dbName: string,
  user: string,
  pass: string,
  alias?: string
) {
  const pouchHttp = await normalizeImport(import("pouchdb-adapter-http"));
  return new PouchAdapter(
    {
      protocol: protocol,
      user: user,
      password: pass,
      host: apiEndpoint,
      dbName: dbName,
      plugins: [pouchHttp],
    },
    alias
  );
}

export async function getLocalPouch(dbName: string, alias?: string) {
  const pouchLvlDb = await normalizeImport(import("pouchdb-adapter-idb"));
  return new PouchAdapter(
    {
      protocol: protocol,
      dbName: dbName,
      plugins: [pouchLvlDb],
    },
    alias
  );
}
