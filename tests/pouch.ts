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
  alias?: string,
  adminUser?: string,
  adminPassword?: string
) {
  const pouchHttp = await normalizeImport(import("pouchdb-adapter-http"));
  const resolvedAdminUser =
    adminUser ??
    process.env.POUCH_ADMIN_USER ??
    process.env.COUCHDB_ADMIN_USER ??
    user;
  const resolvedAdminPassword =
    adminPassword ??
    process.env.POUCH_ADMIN_PASSWORD ??
    process.env.COUCHDB_ADMIN_PASSWORD ??
    pass;
  return new PouchAdapter(
    {
      protocol: protocol,
      user: user,
      password: pass,
      adminUser: resolvedAdminUser,
      adminPassword: resolvedAdminPassword,
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
