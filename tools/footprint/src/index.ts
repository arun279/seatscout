import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import {
  branchesOf,
  type Bundle,
  type Complexity,
  type Diff,
  filesOf,
  render,
  type Side,
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

const complexityOf = (ref: string): Complexity => {
  const directory = mkdtempSync(join(tmpdir(), "footprint-"));
  const archive = join(directory, "tree.tar");
  git("archive", "--output", archive, ref);
  execFileSync("tar", ["-x", "-f", archive, "-C", directory]);
  rmSync(archive);
  const counted = execFileSync("scc", ["--format", "json", "--by-file", "."], {
    cwd: directory,
    encoding: "utf8",
  });
  rmSync(directory, { recursive: true });
  return branchesOf(JSON.parse(counted));
};

const sideOf = (ref: string): Side => ({
  ref,
  tree: treeOf(ref),
  complexity: complexityOf(ref),
});

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
  base: sideOf(base),
  head: sideOf(head),
  diff: diffOf(base, head),
  bundles: bundlesOf(),
});

if (values.out) writeFileSync(values.out, report.markdown);
process.stdout.write(report.markdown);
process.exitCode = report.passed ? 0 : 1;
