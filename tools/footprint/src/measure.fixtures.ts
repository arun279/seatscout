import { BIOME, OXLINT } from "./limits.js";
import { measureWith, RATCHET, STRYKER } from "./measure.js";
import type { Completed, Run } from "./shell.js";

export interface Command {
  readonly command: string;
  readonly args: readonly string[];
}

export const MUTATION_REPORT = "reports/mutation/mutation.json";

const OXLINT_OUTPUT = JSON.stringify({
  diagnostics: [
    {
      message: "function `read` has a complexity of 9. Maximum allowed is 0.",
      filename: "packages/core/src/read.ts",
      labels: [{ span: { line: 41 } }],
    },
    {
      message: "function has a complexity of 3. Maximum allowed is 0.",
      filename: "packages/core/src/seat.ts",
      labels: [{ span: { line: 7 } }],
    },
  ],
});

const BIOME_OUTPUT = JSON.stringify({
  summary: { unchanged: 2 },
  diagnostics: [
    {
      category: "lint/complexity/noExcessiveCognitiveComplexity",
      message: "Excessive complexity of 14 detected (max: 1).",
      location: { path: "tools/corpus-rows.mjs", start: { line: 39 } },
    },
    {
      category: "lint/style/noExcessiveLinesPerFile",
      message: "This file has too many lines (297). Maximum allowed is 1.",
      location: { path: "packages/core/src/map.test.ts", start: { line: 1 } },
    },
    {
      category: "lint/style/noExcessiveLinesPerFile",
      message: "This file has too many lines (12). Maximum allowed is 1.",
      location: { path: "packages/core/src/seat.ts", start: { line: 1 } },
    },
  ],
});

const VITEST_OUTPUT = JSON.stringify([
  { name: "one", file: "packages/core/src/seat.test.ts" },
  { name: "another", file: "packages/core/src/seat.test.ts" },
]);

const PLAYWRIGHT_OUTPUT = JSON.stringify({
  suites: [{ specs: [{ tests: [{ status: "skipped" }] }] }],
});

const SIZE_LIMIT_OUTPUT = JSON.stringify([
  { name: "web app", size: 15, sizeLimit: 15, passed: true },
]);

const MUTATION_OUTPUT = JSON.stringify({
  schemaVersion: "2.0",
  thresholds: { high: 100, low: 100, break: 100 },
  files: {
    "packages/core/src/seat.ts": {
      language: "typescript",
      source: "export const two = (n) => n * 2;\n",
      mutants: [
        { id: "0", mutatorName: "ArithmeticOperator", status: "Killed" },
        { id: "1", mutatorName: "BlockStatement", status: "Ignored" },
      ],
    },
  },
});

const CLOC_TREE = JSON.stringify({
  header: { cloc_version: "2.10" },
  "packages/core/src/seat.ts": { code: 40, comment: 1 },
  SUM: { code: 40, comment: 1 },
});

const CLOC_DIFF = JSON.stringify({
  added: { "packages/core/src/seat.ts": { code: 5, comment: 0 } },
  removed: {},
  modified: {},
});

const FROM_PNPM: Record<string, string> = {
  "size-limit": SIZE_LIMIT_OUTPUT,
  oxlint: OXLINT_OUTPUT,
  biome: BIOME_OUTPUT,
  vitest: VITEST_OUTPUT,
  playwright: PLAYWRIGHT_OUTPUT,
};

const FILES: Record<string, string> = {
  [RATCHET]: JSON.stringify({ comments: 0, tests: 1 }),
  [OXLINT]: JSON.stringify({
    rules: { complexity: ["error", { max: 10, variant: "classic" }] },
  }),
  [BIOME]: JSON.stringify({
    linter: {
      rules: {
        complexity: {
          noExcessiveCognitiveComplexity: {
            options: { maxAllowedComplexity: 15 },
          },
        },
        style: {
          noExcessiveLinesPerFile: { options: { maxLines: 300 } },
        },
      },
    },
  }),
  [STRYKER]: JSON.stringify({ jsonReporter: { fileName: MUTATION_REPORT } }),
  [MUTATION_REPORT]: MUTATION_OUTPUT,
};

const canned = ({ command, args }: Command): string => {
  if (command === "git" && args[0] === "rev-parse") return "head-sha\n";
  if (command === "git" && args[0] === "merge-base") return "base-sha\n";
  if (command === "cloc") return args[1] === "--diff" ? CLOC_DIFF : CLOC_TREE;
  if (command === "pnpm") return FROM_PNPM[args[1] ?? ""] ?? "";
  return "";
};

export const recorder = (
  over: (command: Command) => Completed | undefined = () => undefined,
) => {
  const commands: Command[] = [];

  const run: Run = (command, args) => {
    const call = { command, args: [...args] };
    commands.push(call);
    return over(call) ?? { ok: true, stdout: canned(call), stderr: "" };
  };

  return { run, commands };
};

export const reading = (over: Record<string, string> = {}) => {
  const asked: string[] = [];
  const read = (path: string) => {
    asked.push(path);
    return { ...FILES, ...over }[path] ?? "";
  };
  return { read, asked };
};

export const measuring = (run: Run, over: Record<string, string> = {}) =>
  measureWith(run, reading(over).read);

export const lines = (commands: readonly Command[]): readonly string[] =>
  commands.map(({ command, args }) => [command, ...args].join(" "));
