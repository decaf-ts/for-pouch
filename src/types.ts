import { RepositoryFlags } from "@decaf-ts/db-decorators";

export interface PouchFlags extends RepositoryFlags {
  UUID: string;
}
