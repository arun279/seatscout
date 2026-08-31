import {
  type Bundle,
  type Diff,
  filesOf,
  type Measurement,
  type Side,
  type Tree,
} from "./report.js";
import type { Run } from "./shell.js";

export const RATCHET = ".footprint.json";

export const measureWith = (run: Run, read: (path: string) => string) => {
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

  const bundles = (): readonly Bundle[] => {
    const weighed = JSON.parse(
      run("pnpm", ["exec", "size-limit", "--json"]).stdout,
    );
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

  const commentRatchet = (): number => {
    const configured = JSON.parse(read(RATCHET)).comments;
    if (typeof configured !== "number")
      throw new Error(
        `${RATCHET} sets no number of comments to hold the tree to:\n${JSON.stringify(configured)}`,
      );
    return configured;
  };

  return (baseRef: string, headRef: string): Measurement => {
    const head = git("rev-parse", headRef);
    const base = git("merge-base", baseRef, head);
    return {
      base: sideOf(base),
      head: sideOf(head),
      diff: diffOf(base, head),
      bundles: bundles(),
      commentRatchet: commentRatchet(),
    };
  };
};
