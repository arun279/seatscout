import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { biomeOver, overPlanted, said } from "./planted.fixtures.ts";

const RULE = "style/noExcessiveLinesPerFile";

const plantedIn = (at: string) => join(at, "over.ts");

const withoutTheLastLine = (source: string) =>
  `${source.split("\n").slice(0, -2).join("\n")}\n`;

describe("the planted red under the file length gate", () => {
  it("refuses a planted file one line over the limit, by length and by limit", () => {
    const run = overPlanted("lines", (at) => biomeOver(RULE, plantedIn(at)));

    expect(run.status).toBe(1);
    expect(said(run)).toContain(
      "This file has too many lines (301). Maximum allowed is 300.",
    );
    expect(run.stdout).toContain("Found 1 error");
  });

  it("accepts the same file with its last line taken off, so it is the count and not the file", () => {
    const run = overPlanted("lines", (at) => {
      writeFileSync(
        plantedIn(at),
        withoutTheLastLine(readFileSync(plantedIn(at), "utf8")),
      );
      return biomeOver(RULE, plantedIn(at));
    });

    expect(run.status).toBe(0);
    expect(run.stdout).toContain("Checked 1 file");
  });
});
