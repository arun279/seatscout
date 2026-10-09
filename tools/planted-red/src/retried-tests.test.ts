import { describe, expect, it } from "vitest";
import { lintedInApp, said } from "./planted.fixtures.ts";

const REFUSAL = "A mutant's run skips every test after its first failure";

const linted = (named: string) => lintedInApp("retries", named);

describe("the planted red under the retried or concurrent test gate", () => {
  for (const [written, named] of [
    ["a retried test", "retried.test.ts"],
    ["a concurrent test", "concurrent.test.ts"],
    ["a table of concurrent tests", "concurrent-each.test.ts"],
  ])
    it(`refuses ${written}`, () => {
      const run = linted(named ?? "");

      expect(run.status).toBe(1);
      expect(said(run)).toContain(REFUSAL);
    });

  it("passes plain tests and other jest calls, so it is not refusing every test", () => {
    const run = linted("plain.test.ts");

    expect(run.status).toBe(0);
    expect(said(run)).not.toContain(REFUSAL);
  });
});
