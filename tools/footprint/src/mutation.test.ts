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
      mutationFrom(
        "a run",
        weighing(["Killed", "Timeout", "Survived", "Survived"]),
      ),
    ).toStrictEqual({
      over: "a run",
      score: 50,
      detected: 2,
      weighed: 4,
      breaksAt: 100,
    });
  });

  it("leaves a mutant the score does not count out of what it weighed", () => {
    expect(
      mutationFrom("a run", weighing(["Killed", "Ignored", "CompileError"]))
        .weighed,
    ).toBe(1);
  });

  it("counts a mutant no test covered against the score", () => {
    expect(
      mutationFrom("a run", weighing(["Killed", "NoCoverage"])).score,
    ).toBe(50);
  });

  it("takes the threshold from the report rather than restating one", () => {
    expect(
      mutationFrom(
        "a run",
        weighing(["Killed"], { high: 80, low: 60, break: 90 }),
      ).breaksAt,
    ).toBe(90);
  });

  it("refuses a run whose every mutant was ignored or would not compile", () => {
    expect(() =>
      mutationFrom("a run", weighing(["Ignored", "CompileError"])),
    ).toThrow("The mutation run weighed no mutant");
  });

  it("refuses a report that names no break threshold", () => {
    expect(() => mutationFrom("a run", weighing(["Killed"], {}))).toThrow(
      "The mutation report names no break threshold",
    );
  });

  it("refuses a report carrying no thresholds at all", () => {
    const bare = JSON.stringify({
      schemaVersion: "2.0",
      files: {
        "packages/core/src/seat.ts": {
          language: "typescript",
          source: "export const two = (n) => n * 2;\n",
          mutants: [
            { id: "0", mutatorName: "BooleanLiteral", status: "Killed" },
          ],
        },
      },
    });

    expect(() => mutationFrom("a run", bare)).toThrow(
      "The mutation report names no break threshold",
    );
  });
});

describe("the score against its threshold", () => {
  it("holds at the threshold and prints the score to two places", () => {
    const { lines, passed } = mutation([
      {
        over: "Everything in Node",
        score: 100,
        detected: 2174,
        weighed: 2174,
        breaksAt: 100,
      },
    ]);

    expect(passed).toBe(true);
    expect(lines).toContain(
      "| Everything in Node | 100.00 | 2174 | 2174 | 100 |",
    );
    expect(lines).toContain(
      "Everything in Node: the score may not fall below the threshold, which is 100. At or above it.",
    );
  });

  it("fails below the threshold and names the way through", () => {
    const { lines, passed } = mutation([
      {
        over: "The Expo app",
        score: 99.5,
        detected: 199,
        weighed: 200,
        breaksAt: 100,
      },
    ]);

    expect(passed).toBe(false);
    expect(lines).toContain("| The Expo app | 99.50 | 199 | 200 | 100 |");
    expect(lines).toContain(
      "The Expo app: the score may not fall below the threshold, which is 100. Below it. Kill the mutants the run left alive, or cover the code no test reaches; the run names every one of them.",
    );
  });

  it("passes a score above a threshold set lower than a hundred", () => {
    expect(
      mutation([
        {
          over: "a run",
          score: 95,
          detected: 19,
          weighed: 20,
          breaksAt: 90,
        },
      ]).passed,
    ).toBe(true);
  });

  it("fails when one run of several falls below its own threshold", () => {
    const { lines, passed } = mutation([
      {
        over: "Everything in Node",
        score: 100,
        detected: 10,
        weighed: 10,
        breaksAt: 100,
      },
      {
        over: "The Expo app",
        score: 90,
        detected: 9,
        weighed: 10,
        breaksAt: 100,
      },
    ]);

    expect(passed).toBe(false);
    expect(lines).toContain("| Everything in Node | 100.00 | 10 | 10 | 100 |");
    expect(lines).toContain("| The Expo app | 90.00 | 9 | 10 | 100 |");
  });
});
