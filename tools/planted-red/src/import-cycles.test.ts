import { describe, expect, it } from "vitest";
import { biomeOver, overPlanted, said } from "./planted.fixtures.ts";

const RULE = "suspicious/noImportCycles";

describe("the planted red under the import cycle gate", () => {
  it("refuses a planted pair of modules importing each other, naming both imports", () => {
    const run = overPlanted("cycles", (at) => biomeOver(RULE, at));

    expect(run.status).toBe(1);
    expect(said(run)).toContain("This import is part of a cycle");
    expect(run.stdout).toContain("Found 2 errors");
  });

  it("accepts a planted pair that imports one way, so it is not refusing every import", () => {
    const run = overPlanted("no-cycle", (at) => biomeOver(RULE, at));

    expect(run.status).toBe(0);
    expect(said(run)).not.toContain("part of a cycle");
    expect(run.stdout).toContain("Checked 2 files");
  });
});
