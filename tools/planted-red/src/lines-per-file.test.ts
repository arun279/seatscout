import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { overPlanted, ran, said } from "./planted.fixtures.ts";

const PLANTED = "over.ts";

const biomeOver = (shorten: boolean) =>
  overPlanted("lines", (at) => {
    const file = join(at, PLANTED);
    if (shorten)
      writeFileSync(
        file,
        `${readFileSync(file, "utf8").split("\n").slice(0, -2).join("\n")}\n`,
      );
    return ran(
      "biome",
      "lint",
      "--vcs-enabled=false",
      "--only=style/noExcessiveLinesPerFile",
      file,
    );
  });

describe("the planted red under the file length gate", () => {
  it("refuses a planted file one line over the limit, by length and by limit", () => {
    const run = biomeOver(false);

    expect(run.status).toBe(1);
    expect(said(run)).toContain(
      "This file has too many lines (301). Maximum allowed is 300.",
    );
    expect(run.stdout).toContain("Found 1 error");
  });

  it("accepts the same file with its last line taken off, so it is the count and not the file", () => {
    const run = biomeOver(true);

    expect(run.status).toBe(0);
    expect(run.stdout).toContain("Checked 1 file");
  });
});
