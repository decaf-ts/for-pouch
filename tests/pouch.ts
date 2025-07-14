// import PouchDB from "pouchdb-core";

export async function normalizeImport<T>(
  importPromise: Promise<T>
): Promise<T> {
  // CommonJS's `module.exports` is wrapped as `default` in ESModule.
  return importPromise.then((m: any) => (m.default || m) as T);
}

const protocol = "http";
const apiEndpoint = "localhost:10010";

export async function setupBasicPouch() {
  let PouchDB ;
  try {
    PouchDB = await normalizeImport(import("pouchdb-core"));
    const pouchMapReduce = await normalizeImport(import("pouchdb-mapreduce"));
    const pouchReplication = await normalizeImport(
      import("pouchdb-replication")
    );
    const pouchFind = await normalizeImport(import("pouchdb-find"));
    PouchDB.plugin(pouchMapReduce).plugin(pouchReplication).plugin(pouchFind);
    return PouchDB;
  } catch (e: any) {
    if (e instanceof Error && e.message.includes("redefine property")) return PouchDB; //plugin has already been loaded so it's ok
    throw e;
  }
}

export async function getHttpPouch(dbName: string, user: string, pass: string) {
  const PouchDB = await setupBasicPouch();
  const pouchHttp = await normalizeImport(import("pouchdb-adapter-http"));
  PouchDB.plugin(pouchHttp);
  return new PouchDB(`${protocol}://${user}:${pass}@${apiEndpoint}/${dbName}`);
}

export async function getLocalPouch(dbName: string) {
  const PouchDB = await setupBasicPouch();
  const pouchLvlDb = await normalizeImport(import("pouchdb-adapter-idb"));
  PouchDB.plugin(pouchLvlDb);
  return new PouchDB(`local_dbs/${dbName}`);
}
