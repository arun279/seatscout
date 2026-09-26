import { existsSync, readFileSync } from "node:fs";

export const read = (path: string): string | null =>
  existsSync(path) ? readFileSync(path, "utf8") : null;
