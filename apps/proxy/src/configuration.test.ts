import { describe, expect, it } from "vitest";
import wrangler from "../wrangler.json";

describe("the deployed configuration", () => {
  it("declares nothing but itself and the directory it publishes, so there is nowhere for user data to go", () => {
    expect(Object.keys(wrangler).sort()).toEqual([
      "$schema",
      "assets",
      "compatibility_date",
      "main",
      "name",
    ]);
  });

  it("publishes that directory without taking a binding to it, so the worker cannot reach it either", () => {
    expect(Object.keys(wrangler.assets)).toEqual(["directory"]);
  });
});
