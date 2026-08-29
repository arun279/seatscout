import { execFileSync } from "node:child_process";

const git = (...args: readonly string[]): string =>
  execFileSync("git", args, { encoding: "utf8", maxBuffer: Infinity });

export const listing = (pathspec: string): string =>
  git("ls-files", "--", pathspec);

export const staged = (path: string): string => git("show", `:${path}`);
