import { describe, expect, it } from "vitest";
import {
  branching,
  observed,
  reported,
  SOME_FILES,
} from "./limits.fixtures.js";

describe("the highest reading each linter reports", () => {
  it("takes the highest branching score rather than the first reported", () => {
    const peak = observed(branching(["low", 4, 3], ["high", 9, 8])).cyclomatic;

    expect(peak.value).toBe(8);
    expect(peak.at).toContain("high");
  });

  it("takes the highest rather than the last reported either", () => {
    const peak = observed(branching(["high", 9, 8], ["low", 4, 3])).cyclomatic;

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

  it("refuses an understandability finding whose number it cannot read", () => {
    const renamed = JSON.stringify({
      diagnostics: [
        {
          category: "lint/complexity/noExcessiveCognitiveComplexity",
          message: "This function is hard to follow.",
          location: { path: "read.ts", start: { line: 1 } },
        },
      ],
    });

    expect(() => observed(undefined, renamed)).toThrow(
      "A cognitive complexity came back in a shape this report cannot read",
    );
  });

  it("refuses a file length finding whose number it cannot read", () => {
    const renamed = JSON.stringify({
      diagnostics: [
        {
          category: "lint/complexity/noExcessiveCognitiveComplexity",
          message: "Excessive complexity of 3 detected (max: 1).",
          location: { path: "read.ts", start: { line: 1 } },
        },
        {
          category: "lint/style/noExcessiveLinesPerFile",
          message: "This file is too long.",
          location: { path: "read.ts", start: { line: 1 } },
        },
      ],
    });

    expect(() => observed(undefined, renamed)).toThrow(
      "A file length came back in a shape this report cannot read",
    );
  });

  it("refuses a branching finding whose number it cannot read", () => {
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
