import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { blanked, SCRIPT } from "./blank.js";

interface Writer {
  readonly write: (text: string) => void;
}

const blankTree = (root: string): number => {
  const scripts = readdirSync(root, { recursive: true })
    .map(String)
    .filter((path) => SCRIPT.test(path))
    .map((path) => join(root, path));
  for (const path of scripts)
    writeFileSync(path, blanked(path, readFileSync(path, "utf8")));
  return scripts.length;
};

export const blankAll = (argv: readonly string[], err: Writer): number => {
  const [root] = argv.slice(2);
  if (root === undefined) {
    err.write("usage: blank-index <directory>\n");
    return 2;
  }
  if (blankTree(root) > 0) return 0;
  err.write(`${root} holds no script to blank\n`);
  return 1;
};
