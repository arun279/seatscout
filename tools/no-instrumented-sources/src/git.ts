import { execFileSync } from "node:child_process";

export const SOURCES = ["*.ts", "*.tsx", "*.mts", "*.cts"];

export const listing = (): string =>
  execFileSync("git", ["ls-files", ...SOURCES], {
    encoding: "utf8",
    maxBuffer: Infinity,
  });
