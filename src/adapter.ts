import "reflect-metadata";
import { CouchDBAdapter, DocumentScope } from "@decaf-ts/for-couchdb";
import { InternalError } from "@decaf-ts/db-decorators";
import { User } from "@decaf-ts/core";

export class PouchAdapter extends CouchDBAdapter {
  constructor(scope: DocumentScope<any>, flavour: string = "pouch") {
    super(scope, flavour);
  }

  async user(): Promise<User> {
    throw new InternalError("Not implemented");
  }
}
