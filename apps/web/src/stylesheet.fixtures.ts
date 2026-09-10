import { readFile } from "node:fs/promises";

export const drawn = async <T>(path: string, read: () => T): Promise<T> => {
  const sheet = document.createElement("style");
  sheet.textContent = await readFile(path, "utf8");
  document.head.append(sheet);
  const found = read();
  sheet.remove();
  return found;
};
