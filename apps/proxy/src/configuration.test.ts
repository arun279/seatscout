import { describe, expect, it } from "vitest";
import wrangler from "../wrangler.json";

describe("the deployed configuration", () => {
  it("declares nothing but itself, so there is nowhere for user data to go", () => {
    expect(Object.keys(wrangler).sort()).toEqual([
      "$schema",
      "compatibility_date",
      "main",
      "name",
    ]);
  });
});
