import { describe, expect, it } from "vitest";
import { mutation, mutationFrom } from "./mutation.js";

const weighing = (
  statuses: readonly string[],
  thresholds: Record<string, number> = { high: 100, low: 100, break: 100 },
): string =>
  JSON.stringify({
    schemaVersion: "2.0",
    thresholds,
    files: {
      "packages/core/src/seat.ts": {
        language: "typescript",
        source: "export const two = (n) => n * 2;\n",
        mutants: statuses.map((status, id) => ({
          id: String(id),
          mutatorName: "ArithmeticOperator",
          status,
        })),
      },
    },
  });

describe("reading a mutation run", () => {
  it("takes the score, what it detected and what it weighed", () => {
    expect(
      mutationFrom(weighing(["Killed", "Timeout", "Survived", "Survived"])),
    ).toStrictEqual({ score: 50, detected: 2, weighed: 4, breaksAt: 100 });
  });

  it("leaves a mutant the score does not count out of what it weighed", () => {
    expect(
      mutationFrom(weighing(["Killed", "Ignored", "CompileError"])).weighed,
    ).toBe(1);
  });

  it("counts a mutant no test covered against the score", () => {
    expect(mutationFrom(weighing(["Killed", "NoCoverage"])).score).toBe(50);
  });

  it("takes the threshold from the report rather than restating one", () => {
    expect(
      mutationFrom(weighing(["Killed"], { high: 80, low: 60, break: 90 }))
        .breaksAt,
    ).toBe(90);
  });

  it("refuses a run whose every mutant was ignored or would not compile", () => {
    expect(() => mutationFrom(weighing(["Ignored", "CompileError"]))).toThrow(
      "The mutation run weighed no mutant",
    );
  });

  it("refuses a report that names no break threshold", () => {
    expect(() => mutationFrom(weighing(["Killed"], {}))).toThrow(
      "The mutation report names no break threshold",
    );
  });
});

describe("the score against its threshold", () => {
  it("holds at the threshold and prints the score to two places", () => {
    const { lines, passed } = mutation({
      score: 100,
      detected: 2174,
      weighed: 2174,
      breaksAt: 100,
    });

    expect(passed).toBe(true);
    expect(lines).toContain("| 100.00 | 2174 | 2174 | 100 |");
    expect(lines).toContain(
      "The score may not fall below the threshold, which is 100. At or above it.",
    );
  });

  it("fails below the threshold and names the way through", () => {
    const { lines, passed } = mutation({
      score: 99.5,
      detected: 199,
      weighed: 200,
      breaksAt: 100,
    });

    expect(passed).toBe(false);
    expect(lines).toContain("| 99.50 | 199 | 200 | 100 |");
    expect(lines).toContain(
      "The score may not fall below the threshold, which is 100. Below it. Kill the mutants the run left alive, or cover the code no test reaches; the run names every one of them.",
    );
  });

  it("passes a score above a threshold set lower than a hundred", () => {
    expect(
      mutation({ score: 95, detected: 19, weighed: 20, breaksAt: 90 }).passed,
    ).toBe(true);
  });
});
