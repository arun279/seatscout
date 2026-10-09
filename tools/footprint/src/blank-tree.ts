import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { blanked, SCRIPT } from "./blank.js";

export const blankTree = (root: string): number => {
  const scripts = readdirSync(root, { recursive: true, encoding: "utf8" })
    .filter((path) => SCRIPT.test(path))
    .map((path) => join(root, path));
  for (const path of scripts)
    writeFileSync(path, blanked(path, readFileSync(path, "utf8")));
  return scripts.length;
};
