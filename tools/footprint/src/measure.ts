import { join } from "node:path";
import type { Weighing } from "./bundles.js";
import {
  BIOME,
  type Gates,
  gatesFrom,
  type Limits,
  limitsFrom,
  OXLINT,
} from "./limits.js";
import type { Measurement, Ratchets } from "./report.js";
import type { Run } from "./shell.js";
import { type Suites, suitesFrom } from "./suites.js";
import { type Diff, filesOf, type Side, type Tree } from "./volume.js";

export const RATCHET = ".footprint.json";
export const BUNDLES = ".size-limit.json";

const weighedAs = (configuration: string): string =>
  JSON.stringify(
    JSON.parse(configuration).map(
      ({ limit: _limit, ...weighing }: Readonly<Record<string, unknown>>) =>
        weighing,
    ),
  );
const NATIVE_JEST = "apps/native/jest.config.js";

const NATIVE_JEST_RUN: readonly string[] = [
  "exec",
  "jest",
  "--config",
  NATIVE_JEST,
  "--ci",
  "--json",
  "--maxWorkers",
  "2",
];
export const OXLINT_REPORT = ".oxlintrc.report.json";
export const BIOME_REPORT = "biome.report.json";

const REPORTED = [
  "--only=complexity/noExcessiveCognitiveComplexity",
  "--only=style/noExcessiveLinesPerFile",
  "--reporter=json",
  "--max-diagnostics=none",
];

export const measureWith = (run: Run, read: (path: string) => string) => {
  const output = (command: string, args: readonly string[]): string => {
    const completed = run(command, args);
    if (!completed.ok) {
      throw new Error(`${command} ${args.join(" ")}\n${completed.stderr}`);
    }
    return completed.stdout;
  };

  const whatever = (args: readonly string[]): string =>
    run("pnpm", ["exec", ...args]).stdout;

  const git = (...args: readonly string[]): string =>
    output("git", args).trim();

  const cloc = (...args: readonly string[]): string =>
    output("cloc", [
      ...args,
      "--by-file",
      "--json",
      "--hide-rate",
      "--quiet",
      "--strip-str-comments",
    ]);

  const treeOf = (ref: string): Tree => filesOf(JSON.parse(cloc("--git", ref)));

  const diffOf = (base: string, head: string): Diff =>
    JSON.parse(cloc("--git", "--diff", base, head));

  const sideOf = (ref: string): Side => ({ ref, tree: treeOf(ref) });

  const sizesOn = (
    side: "main" | "this change",
    config: string,
  ): ReadonlyMap<string, number> | string => {
    const weighed = JSON.parse(
      whatever(["size-limit", "--json", "--config", config]),
    );
    if (
      !Array.isArray(weighed) ||
      weighed.length === 0 ||
      weighed.some(
        (bundle) =>
          typeof bundle.name !== "string" || typeof bundle.size !== "number",
      )
    )
      return `size-limit weighed nothing by ${config} on ${side}: ${JSON.stringify(weighed)}`;
    const empty = weighed.filter((bundle) => bundle.size === 0);
    if (side === "this change" && empty.length > 0)
      return `${empty.map((bundle) => bundle.name).join(", ")} weighed 0 B on this change, so its glob matched no file`;
    return new Map(weighed.map((bundle) => [bundle.name, bundle.size]));
  };

  const globsChanged = (mainTree: string): boolean =>
    weighedAs(read(BUNDLES)) !==
    weighedAs(git("-C", mainTree, "show", `HEAD:${BUNDLES}`));

  const weighing = (mainTree: string, mainExported: boolean): Weighing => {
    if (!mainExported)
      return {
        kind: "unweighed",
        reason:
          "main could not be checked out and exported, and the step that tried says why",
      };
    const change = sizesOn("this change", BUNDLES);
    const main = sizesOn("main", join(mainTree, BUNDLES));
    if (typeof change === "string")
      return { kind: "unweighed", reason: change };
    if (typeof main === "string") return { kind: "unweighed", reason: main };
    const paired = [...change].flatMap(([name, size]) => {
      const before = main.get(name);
      return before === undefined ? [] : [{ name, main: before, change: size }];
    });
    return paired.length === main.size && paired.length === change.size
      ? {
          kind: "weighed",
          bundles: paired,
          globsChanged: globsChanged(mainTree),
        }
      : {
          kind: "unweighed",
          reason: `size-limit weighed ${[...main.keys()].join(", ")} on main against ${[...change.keys()].join(", ")} on this change`,
        };
  };

  const gates = (): Gates => gatesFrom(read(OXLINT), read(BIOME));

  const observed = (against: Gates): Limits =>
    limitsFrom(
      whatever(["oxlint", "--config", OXLINT_REPORT, "--format", "json"]),
      whatever(["biome", "lint", `--config-path=${BIOME_REPORT}`, ...REPORTED]),
      against,
    );

  const collected = (): Suites =>
    suitesFrom(
      output("pnpm", ["exec", "vitest", "list", "--json"]),
      output("pnpm", NATIVE_JEST_RUN),
      output("pnpm", [
        "exec",
        "playwright",
        "test",
        "--list",
        "--reporter=json",
      ]),
    );

  const held = (of: string, ratchets: Record<string, unknown>): number => {
    const configured = ratchets[of];
    if (typeof configured !== "number")
      throw new Error(
        `${RATCHET} sets no number of ${of} to hold the tree to:\n${JSON.stringify(configured)}`,
      );
    return configured;
  };

  const ratchets = (): Ratchets => {
    const configured = JSON.parse(read(RATCHET));
    return {
      comments: held("comments", configured),
      tests: held("tests", configured),
    };
  };

  return (
    baseRef: string,
    headRef: string,
    mainTree: string,
    mainExported: boolean,
  ): Measurement => {
    const head = git("rev-parse", headRef);
    const base = git("merge-base", baseRef, head);
    const against = gates();
    return {
      base: sideOf(base),
      head: sideOf(head),
      diff: diffOf(base, head),
      bundles: weighing(mainTree, mainExported),
      gates: against,
      limits: observed(against),
      suites: collected(),
      ratchets: ratchets(),
    };
  };
};
