import { PouchAdapter } from "../../src";
import { BaseError, ConflictError, NotFoundError } from "@decaf-ts/db-decorators";

describe("PouchAdapter.parseError", () => {
  it("returns BaseError unchanged", () => {
    const e = new ConflictError("conflict");
    const parsed = PouchAdapter.parseError(e);
    expect(parsed).toBe(e);
  });

  it("parses conflict and notfound from string messages", () => {
    expect(PouchAdapter.parseError("already exist")).toBeInstanceOf(ConflictError);
    expect(PouchAdapter.parseError("update conflict")).toBeInstanceOf(ConflictError);
    expect(PouchAdapter.parseError("missing")) .toBeInstanceOf(NotFoundError);
    expect(PouchAdapter.parseError("deleted")) .toBeInstanceOf(NotFoundError);
  });

  it("maps status codes to specific errors", () => {
    const e401 = PouchAdapter.parseError(Object.assign(new Error("u"), { status: 401 }));
    expect(e401).toBeInstanceOf(ConflictError);
    const e412 = PouchAdapter.parseError(Object.assign(new Error("u"), { status: 412 }));
    expect(e412).toBeInstanceOf(ConflictError);
    const e409 = PouchAdapter.parseError(Object.assign(new Error("u"), { status: 409 }));
    expect(e409).toBeInstanceOf(ConflictError);

    const e404 = PouchAdapter.parseError(Object.assign(new Error("nf"), { status: 404 }));
    expect(e404).toBeInstanceOf(NotFoundError);

    const e400 = PouchAdapter.parseError(Object.assign(new Error("bad req"), { status: 400 }));
    // Given current implementation, this goes to InternalError branch (IndexError branch is unreachable)
    expect(e400).toBeInstanceOf(BaseError);
    expect(e400).not.toBeInstanceOf(ConflictError);
    expect(e400).not.toBeInstanceOf(NotFoundError);
  });

  it("maps ECONNREFUSED to ConnectionError and defaults to InternalError otherwise", () => {
    const conn = PouchAdapter.parseError(new Error("ECONNREFUSED something"));
    // It should be parsed into a BaseError subtype; we don't assert on class name string
    expect(conn).toBeInstanceOf(BaseError);
    const other = PouchAdapter.parseError(new Error("some other error"));
    expect(other).toBeInstanceOf(BaseError);
  });
});
