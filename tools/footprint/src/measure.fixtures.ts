import { BIOME, OXLINT } from "./limits.js";
import type { Measure } from "./main.js";
import { BUNDLES, measureWith, RATCHET } from "./measure.js";
import type { Completed, Run } from "./shell.js";

export interface Command {
  readonly command: string;
  readonly args: readonly string[];
}

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

const JEST_OUTPUT = JSON.stringify({ numTotalTests: 3, success: true });

const SIZE_LIMIT_OUTPUT = JSON.stringify([{ name: "app for iOS", size: 15 }]);

export const GLOBS: string = JSON.stringify([
  { name: "app for iOS", path: "dist/ios/*.js" },
]);

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

const JEST_RUN =
  "exec jest --config apps/native/jest.config.js --ci --json --maxWorkers 2";

const jestAnswer = (args: readonly string[]) =>
  args.join(" ") === JEST_RUN ? JEST_OUTPUT : "";

const FILES: Record<string, string> = {
  [RATCHET]: JSON.stringify({ comments: 0, tests: 1 }),
  [BUNDLES]: GLOBS,
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
};

const ANSWERS: Record<string, (args: readonly string[]) => string> = {
  git: (args) =>
    ({ "merge-base": "base-sha\n", "-C": GLOBS })[args[0] ?? ""] ??
    "head-sha\n",
  cloc: (args) => (args[1] === "--diff" ? CLOC_DIFF : CLOC_TREE),
  pnpm: (args) =>
    args[1] === "jest" ? jestAnswer(args) : (FROM_PNPM[args[1] ?? ""] ?? ""),
};

const canned = ({ command, args }: Command): string =>
  ANSWERS[command]?.(args) ?? "";

export const recorder = (
  over: (command: Command) => Completed | undefined = () => undefined,
): { readonly run: Run; readonly commands: readonly Command[] } => {
  const commands: Command[] = [];

  const run: Run = (command, args) => {
    const call = { command, args: [...args] };
    commands.push(call);
    return over(call) ?? { ok: true, stdout: canned(call), stderr: "" };
  };

  return { run, commands };
};

export const reading = (
  over: Record<string, string> = {},
): {
  readonly read: (path: string) => string;
  readonly asked: readonly string[];
} => {
  const asked: string[] = [];
  const read = (path: string) => {
    asked.push(path);
    return { ...FILES, ...over }[path] ?? "";
  };
  return { read, asked };
};

export const measuring = (
  run: Run,
  over: Record<string, string> = {},
): Measure => measureWith(run, reading(over).read);

export const lines = (commands: readonly Command[]): readonly string[] =>
  commands.map(({ command, args }) => [command, ...args].join(" "));
