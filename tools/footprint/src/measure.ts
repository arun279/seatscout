import {
  type Bundle,
  type Diff,
  filesOf,
  type Measurement,
  type Side,
  type Tree,
} from "./report.js";
import type { Run } from "./shell.js";

export const measureWith = (run: Run) => {
  const output = (command: string, args: readonly string[]): string => {
    const completed = run(command, args);
    if (!completed.ok) {
      throw new Error(`${command} ${args.join(" ")}\n${completed.stderr}`);
    }
    return completed.stdout;
  };

  const git = (...args: readonly string[]): string =>
    output("git", args).trim();

  const cloc = (...args: readonly string[]): string =>
    output("cloc", [...args, "--by-file", "--json", "--hide-rate", "--quiet"]);

  const treeOf = (ref: string): Tree => filesOf(JSON.parse(cloc("--git", ref)));

  const diffOf = (base: string, head: string): Diff =>
    JSON.parse(cloc("--git", "--diff", base, head));

  const sideOf = (ref: string): Side => ({ ref, tree: treeOf(ref) });

  const bundles = (): readonly Bundle[] =>
    JSON.parse(run("pnpm", ["exec", "size-limit", "--json"]).stdout);

  return (baseRef: string, headRef: string): Measurement => {
    const head = git("rev-parse", headRef);
    const base = git("merge-base", baseRef, head);
    return {
      base: sideOf(base),
      head: sideOf(head),
      diff: diffOf(base, head),
      bundles: bundles(),
    };
  };
};
