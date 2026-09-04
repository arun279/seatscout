import { describe, expect, it } from "vitest";
import {
  BIOME_CONFIG,
  branching,
  GATES,
  observed,
  OXLINT_CONFIG,
  reported,
} from "./limits.fixtures.js";
import { BIOME, gatesFrom, limits, OXLINT } from "./limits.js";

describe("the limits the figures stand beside", () => {
  it("names the two files it reads them out of", () => {
    expect(OXLINT).toBe(".oxlintrc.json");
    expect(BIOME).toBe("biome.json");
  });

  it("reads each one out of the configuration that gates it", () => {
    expect(gatesFrom(OXLINT_CONFIG, BIOME_CONFIG)).toStrictEqual({
      cyclomatic: 12,
      cognitive: 17,
      lines: 500,
    });
  });

  it("refuses a half written cyclomatic rule at whichever step it stops", () => {
    const halves = [
      "{}",
      JSON.stringify({ rules: {} }),
      JSON.stringify({ rules: { complexity: ["error"] } }),
      JSON.stringify({
        rules: { complexity: ["error", { variant: "classic" }] },
      }),
    ];

    for (const half of halves)
      expect(() => gatesFrom(half, BIOME_CONFIG)).toThrow(
        `${OXLINT} sets no cyclomatic complexity limit`,
      );
  });

  it("refuses a half written Biome rule at whichever step it stops", () => {
    const halves = [
      "{}",
      JSON.stringify({ linter: {} }),
      JSON.stringify({ linter: { rules: {} } }),
      JSON.stringify({ linter: { rules: { complexity: {} } } }),
      JSON.stringify({
        linter: {
          rules: { complexity: { noExcessiveCognitiveComplexity: {} } },
        },
      }),
      JSON.stringify({
        linter: {
          rules: {
            complexity: { noExcessiveCognitiveComplexity: { options: {} } },
          },
        },
      }),
    ];

    for (const half of halves)
      expect(() => gatesFrom(OXLINT_CONFIG, half)).toThrow(
        `${BIOME} sets no cognitive complexity limit`,
      );
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
