import { type Gates, limitsFrom } from "./limits.js";

export const GATES: Gates = { cyclomatic: 10, cognitive: 15, lines: 300 };

export const branching = (
  ...functions: readonly [string, number, number][]
): string =>
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

export const reported = (
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

export const SOME_FILES: readonly [string, number][] = [["a.ts", 12]];

export const observed = (
  oxlint = branching(["read", 41, 9]),
  biome = reported([14], SOME_FILES),
) => limitsFrom(oxlint, biome, GATES);

export const OXLINT_CONFIG = JSON.stringify({
  rules: { complexity: ["error", { max: 12, variant: "classic" }] },
});

export const BIOME_CONFIG = JSON.stringify({
  linter: {
    rules: {
      complexity: {
        noExcessiveCognitiveComplexity: {
          options: { maxAllowedComplexity: 17 },
        },
      },
      style: { noExcessiveLinesPerFile: { options: { maxLines: 500 } } },
    },
  },
});
