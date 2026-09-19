import { describe, expect, it } from "vitest";
import { overPlanted, ran, said } from "./planted.fixtures.ts";

const biomeOver = (fixture: string) =>
  overPlanted(fixture, (at) =>
    ran(
      "biome",
      "lint",
      "--vcs-enabled=false",
      "--only=suspicious/noImportCycles",
      at,
    ),
  );

describe("the planted red under the import cycle gate", () => {
  it("refuses a planted pair of modules importing each other, naming both imports", () => {
    const run = biomeOver("cycles");

    expect(run.status).toBe(1);
    expect(said(run)).toContain("This import is part of a cycle");
    expect(run.stdout).toContain("Found 2 errors");
  });

  it("accepts a planted pair that imports one way, so it is not refusing every import", () => {
    const run = biomeOver("no-cycle");

    expect(run.status).toBe(0);
    expect(said(run)).not.toContain("part of a cycle");
    expect(run.stdout).toContain("Checked 2 files");
  });
});
