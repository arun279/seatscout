import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { overPlanted, ran, said } from "./planted.fixtures.ts";

const REFUSAL = "This call runs while the test file loads";

const linted = (named: string) =>
  overPlanted("module-scope", (at) =>
    ran("biome", "lint", "--vcs-enabled=false", join(at, named)),
  );

describe("the planted red under the module-scope call gate", () => {
  for (const [written, named] of [
    ["a value read from an app module as the file loads", "read-at-load.tsx"],
    ["a fixture built by a test helper as the file loads", "built-at-load.tsx"],
  ])
    it(`refuses ${written}`, () => {
      const run = linted(named ?? "");

      expect(run.status).toBe(1);
      expect(said(run)).toContain(REFUSAL);
    });

  it("passes calls made inside each test, plain data, and calls into packages, so it is not refusing every file", () => {
    const run = linted("read-in-test.tsx");

    expect(run.status).toBe(0);
    expect(said(run)).not.toContain(REFUSAL);
  });
});
