import { readdir } from "node:fs/promises";

const PAGE = "index.html";
const WORKER = "sw.js";

const CARRIED = [
  PAGE,
  "manifest.webmanifest",
  "icon.svg",
  "fonts/big-shoulders-display.woff2",
  "fonts/schibsted-grotesk.woff2",
  "fonts/spline-sans-mono.woff2",
];

const carries = (file: string) =>
  file !== WORKER &&
  (CARRIED.includes(file) || file.endsWith(".js") || file.endsWith(".css"));

export const shellFilesIn = async (dist: string): Promise<string[]> => {
  const built = await readdir(dist, { recursive: true });
  const absent = CARRIED.filter((file) => !built.includes(file));
  if (absent.length > 0)
    throw new Error(
      `${dist} does not hold ${absent.join(", ")}, which the shell carries.`,
    );
  return built
    .filter(carries)
    .map((file) => (file === PAGE ? "/" : `/${file}`))
    .sort();
};
