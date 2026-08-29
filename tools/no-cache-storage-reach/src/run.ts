import { execFileSync } from "node:child_process";

export const git = (args: readonly string[]): string =>
  execFileSync("git", args, { encoding: "utf8", maxBuffer: Infinity });
