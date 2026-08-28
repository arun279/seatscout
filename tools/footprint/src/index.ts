import { execFileSync, spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import {
  type Bundle,
  type Diff,
  filesOf,
  render,
  type Tree,
} from "./report.js";

const git = (...args: readonly string[]): string =>
  execFileSync("git", args, { encoding: "utf8" }).trim();

const cloc = (...args: readonly string[]): string =>
  execFileSync(
    "cloc",
    [...args, "--by-file", "--json", "--hide-rate", "--quiet"],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

const treeOf = (ref: string): Tree => filesOf(JSON.parse(cloc("--git", ref)));

const diffOf = (base: string, head: string): Diff =>
  JSON.parse(cloc("--git", "--diff", base, head));

const bundlesOf = (): readonly Bundle[] =>
  JSON.parse(
    spawnSync("pnpm", ["exec", "size-limit", "--json"], { encoding: "utf8" })
      .stdout,
  );

const { values } = parseArgs({
  options: {
    base: { type: "string" },
    head: { type: "string" },
    out: { type: "string" },
  },
});

const head = git("rev-parse", values.head ?? "HEAD");
const base = git("merge-base", values.base ?? "origin/main", head);

const report = render({
  base,
  head,
  baseTree: treeOf(base),
  headTree: treeOf(head),
  diff: diffOf(base, head),
  bundles: bundlesOf(),
});

if (values.out) writeFileSync(values.out, report.markdown);
process.stdout.write(report.markdown);
process.exitCode = report.passed ? 0 : 1;
