import { createdByOnPouchCreateUpdate } from "../../src/adapter";
import { Context } from "@decaf-ts/db-decorators";
import { UnsupportedError } from "@decaf-ts/core";

class DummyModel {
  createdBy?: string;
}

describe("createdByOnPouchCreateUpdate decorator handler", () => {
  it("sets UUID from context into the model field", async () => {
    const ctx = new Context<any>().accumulate({ UUID: "user-123" });
    const model = new DummyModel();
    await createdByOnPouchCreateUpdate.call(
      {} as any,
      ctx as any,
      {} as any,
      "createdBy" as any,
      model as any
    );
    expect(model.createdBy).toBe("user-123");
  });

  it("throws UnsupportedError when context/model is invalid", async () => {
    const ctx = new Context<any>().accumulate({});
    await expect(
      createdByOnPouchCreateUpdate.call(
        {} as any,
        ctx as any,
        {} as any,
        "createdBy" as any,
        undefined as any
      )
    ).rejects.toBeInstanceOf(UnsupportedError);
  });
});
