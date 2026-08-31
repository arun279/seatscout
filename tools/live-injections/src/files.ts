import { glob, readFile } from "node:fs/promises";

export const read = (path: string): Promise<string> => readFile(path, "utf8");

export const list = async (pattern: string): Promise<readonly string[]> => {
  const found: string[] = [];
  for await (const file of glob(pattern)) found.push(file);
  return found;
};
