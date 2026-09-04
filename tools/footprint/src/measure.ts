import type { Bundle } from "./bundles.js";
import {
  BIOME,
  type Gates,
  gatesFrom,
  type Limits,
  limitsFrom,
  OXLINT,
} from "./limits.js";
import { type Mutation, mutationFrom } from "./mutation.js";
import type { Measurement, Ratchets } from "./report.js";
import type { Run } from "./shell.js";
import { type Suites, suitesFrom } from "./suites.js";
import { type Diff, filesOf, type Side, type Tree } from "./volume.js";

export const RATCHET = ".footprint.json";
export const STRYKER = "stryker.config.json";
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
    output("cloc", [...args, "--by-file", "--json", "--hide-rate", "--quiet"]);

  const treeOf = (ref: string): Tree => filesOf(JSON.parse(cloc("--git", ref)));

  const diffOf = (base: string, head: string): Diff =>
    JSON.parse(cloc("--git", "--diff", base, head));

  const sideOf = (ref: string): Side => ({ ref, tree: treeOf(ref) });

  const bundles = (): readonly Bundle[] => {
    const weighed = JSON.parse(whatever(["size-limit", "--json"]));
    if (
      !Array.isArray(weighed) ||
      weighed.length === 0 ||
      weighed.some((bundle) => typeof bundle.sizeLimit !== "number")
    )
      throw new Error(
        `size-limit weighed no bundle against a ratchet:\n${JSON.stringify(weighed)}`,
      );
    return weighed;
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
      output("pnpm", [
        "exec",
        "playwright",
        "test",
        "--list",
        "--reporter=json",
      ]),
    );

  const weighed = (): Mutation => {
    const written = JSON.parse(read(STRYKER)).jsonReporter?.fileName;
    if (typeof written !== "string")
      throw new Error(
        `${STRYKER} names no json report, so no mutation run wrote a score to read.`,
      );
    return mutationFrom(read(written));
  };

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

  return (baseRef: string, headRef: string): Measurement => {
    const head = git("rev-parse", headRef);
    const base = git("merge-base", baseRef, head);
    const against = gates();
    return {
      base: sideOf(base),
      head: sideOf(head),
      diff: diffOf(base, head),
      bundles: bundles(),
      gates: against,
      limits: observed(against),
      suites: collected(),
      mutation: weighed(),
      ratchets: ratchets(),
    };
  };
};
