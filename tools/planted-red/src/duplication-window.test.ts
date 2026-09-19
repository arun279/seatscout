import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { overPlanted, ran, said } from "./planted.fixtures.ts";

const jscpdOver = (fixture: string, ...window: string[]) =>
  overPlanted(fixture, (at) => {
    const reported = join(at, "report");
    const run = ran("jscpd", at, "--output", reported, ...window);
    const read = JSON.parse(
      readFileSync(join(reported, "jscpd-report.json"), "utf8"),
    );
    return {
      status: run.status,
      said: said(run),
      sources: read.statistics.total.sources,
      shared: read.duplicates
        .map(
          (clone: { lines: number; tokens: number }) =>
            `${clone.lines} lines, ${clone.tokens} tokens`,
        )
        .toSorted(),
    };
  });

describe("the planted red under the duplication gate", () => {
  it("refuses a planted pair sharing a block inside the Sonar way window, by percentage and threshold", () => {
    const run = jscpdOver("duplication");

    expect(run.status).toBe(1);
    expect(run.said).toContain(
      "jscpd found too many duplicates (33.3%) over threshold (3.0%)",
    );
    expect(run.shared).toStrictEqual(["11 lines, 136 tokens"]);
  });

  it("accepts two planted pairs sharing a block outside it, and says it read all four", () => {
    const run = jscpdOver("no-duplication");

    expect(run.status).toBe(0);
    expect(run.shared).toStrictEqual([]);
    expect(run.sources).toBe(4);
  });

  it("finds both of them once the window is widened, so neither passes by sharing nothing", () => {
    const run = jscpdOver(
      "no-duplication",
      "--min-lines",
      "9",
      "--min-tokens",
      "90",
    );

    expect(run.status).toBe(1);
    expect(run.shared).toStrictEqual([
      "10 lines, 121 tokens",
      "14 lines, 92 tokens",
    ]);
  });
});
