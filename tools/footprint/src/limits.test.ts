import { describe, expect, it } from "vitest";
import { type Gates, gatesFrom, limits, limitsFrom } from "./limits.js";

const GATES: Gates = { cyclomatic: 10, cognitive: 15, lines: 300 };

const branching = (...functions: readonly [string, number, number][]): string =>
  JSON.stringify({
    diagnostics: functions.map(([name, line, score]) => ({
      message:
        name === ""
          ? `function has a complexity of ${score}. Maximum allowed is 0.`
          : `function \`${name}\` has a complexity of ${score}. Maximum allowed is 0.`,
      filename: "packages/core/src/read.ts",
      labels: [{ span: { line } }],
    })),
  });

const reported = (
  scores: readonly number[],
  lengths: readonly [string, number][],
): string =>
  JSON.stringify({
    diagnostics: [
      ...scores.map((score, index) => ({
        category: "lint/complexity/noExcessiveCognitiveComplexity",
        message: `Excessive complexity of ${score} detected (max: 1).`,
        location: { path: "packages/core/src/read.ts", start: { line: index } },
      })),
      ...lengths.map(([path, count]) => ({
        category: "lint/style/noExcessiveLinesPerFile",
        message: `This file has too many lines (${count}). Maximum allowed is 1.`,
        location: { path, start: { line: 1 } },
      })),
    ],
  });

const SOME_FILES: readonly [string, number][] = [["a.ts", 12]];

const observed = (
  oxlint = branching(["read", 41, 9]),
  biome = reported([14], SOME_FILES),
) => limitsFrom(oxlint, biome, GATES);

describe("the highest reading each linter reports", () => {
  it("takes the highest branching score rather than the first reported", () => {
    const peak = observed(branching(["low", 4, 3], ["high", 9, 8])).cyclomatic;

    expect(peak.value).toBe(8);
    expect(peak.at).toContain("high");
  });

  it("breaks a tie on where it sits, so two runs agree", () => {
    const first = observed(branching(["b", 2, 5], ["a", 1, 5])).cyclomatic;
    const second = observed(branching(["a", 1, 5], ["b", 2, 5])).cyclomatic;

    expect(first).toStrictEqual(second);
    expect(first.at).toBe("`packages/core/src/read.ts:1` `a`");
  });

  it("names an anonymous function by the place it sits and nothing else", () => {
    expect(observed(branching(["", 7, 6])).cyclomatic.at).toBe(
      "`packages/core/src/read.ts:7`",
    );
  });

  it("takes the highest understandability score and where it sits", () => {
    expect(
      observed(undefined, reported([2, 13, 6], SOME_FILES)).cognitive,
    ).toStrictEqual({ value: 13, at: "`packages/core/src/read.ts:1`" });
  });

  it("takes the longest file and names it", () => {
    expect(
      observed(
        undefined,
        reported(
          [1],
          [
            ["short.ts", 40],
            ["long.ts", 297],
          ],
        ),
      ).longest,
    ).toStrictEqual({ value: 297, at: "`long.ts`" });
  });
});

describe("how close the tree runs to the line limit", () => {
  it("counts the files within a tenth of the limit and leaves out the rest", () => {
    expect(
      observed(
        undefined,
        reported(
          [1],
          [
            ["a.ts", 269],
            ["b.ts", 270],
            ["c.ts", 299],
          ],
        ),
      ).crowding,
    ).toBe(2);
  });

  it("counts none where every file is comfortably short", () => {
    expect(observed(undefined, reported([1], [["a.ts", 10]])).crowding).toBe(0);
  });
});

describe("a report-only pass that scored nothing", () => {
  it("refuses a branching pass that found no function", () => {
    expect(() => observed(branching())).toThrow(
      "The report-only pass scored no function for branching",
    );
  });

  it("refuses a pass that scored no function for understandability", () => {
    expect(() => observed(undefined, reported([], SOME_FILES))).toThrow(
      "The report-only pass scored no function for understandability",
    );
  });

  it("refuses a pass that counted the lines of no file", () => {
    expect(() => observed(undefined, reported([1], []))).toThrow(
      "The report-only pass scored no file for its length",
    );
  });

  it("refuses a finding whose number it cannot read", () => {
    const renamed = JSON.stringify({
      diagnostics: [
        {
          message: "function `read` is too branchy.",
          filename: "read.ts",
          labels: [{ span: { line: 1 } }],
        },
      ],
    });

    expect(() => observed(renamed)).toThrow(
      "A cyclomatic complexity came back in a shape this report cannot read",
    );
  });

  it("refuses a finding that came back without a place", () => {
    const placeless = JSON.stringify({
      diagnostics: [
        {
          message:
            "function `read` has a complexity of 9. Maximum allowed is 0.",
          filename: "read.ts",
          labels: [],
        },
      ],
    });

    expect(() => observed(placeless)).toThrow(
      "A cyclomatic complexity came back without a place",
    );
  });
});

describe("the limits the figures stand beside", () => {
  it("reads each one out of the configuration that gates it", () => {
    expect(
      gatesFrom(
        JSON.stringify({
          rules: { complexity: ["error", { max: 12, variant: "classic" }] },
        }),
        JSON.stringify({
          linter: {
            rules: {
              complexity: {
                noExcessiveCognitiveComplexity: {
                  options: { maxAllowedComplexity: 17 },
                },
              },
              style: {
                noExcessiveLinesPerFile: { options: { maxLines: 500 } },
              },
            },
          },
        }),
      ),
    ).toStrictEqual({ cyclomatic: 12, cognitive: 17, lines: 500 });
  });
});

describe("the section it renders", () => {
  it("prints each highest reading beside the limit it sits under", () => {
    const { lines, passed } = limits(observed(), GATES);

    expect(passed).toBe(true);
    expect(lines).toContain(
      "| Cyclomatic complexity, per function | 9 | `packages/core/src/read.ts:41` `read` | 10 |",
    );
    expect(lines).toContain(
      "| Cognitive complexity, per function | 14 | `packages/core/src/read.ts:0` | 15 |",
    );
    expect(lines).toContain("| Lines per file | 12 | `a.ts` | 300 |");
  });

  it("says how many files crowd the limit, and at what length", () => {
    const { lines } = limits(
      observed(
        undefined,
        reported(
          [1],
          [
            ["a.ts", 280],
            ["b.ts", 290],
          ],
        ),
      ),
      GATES,
    );

    expect(lines).toContain(
      "2 file(s) sit within 10% of the 300 line limit, at 270 lines or more.",
    );
  });

  it("passes whatever it observed, because nothing in it gates", () => {
    expect(limits(observed(branching(["read", 1, 99])), GATES).passed).toBe(
      true,
    );
  });
});
