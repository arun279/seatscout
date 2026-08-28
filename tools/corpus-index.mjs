#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const corpus = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "packages",
  "core",
  "src",
  "corpus",
);
const manifest = JSON.parse(
  await readFile(join(corpus, "manifest.json"), "utf8"),
);
const refused = new Set(
  manifest.seatMaps
    .filter((entry) => entry.httpStatus !== 200)
    .map((entry) => entry.file),
);

const GROUPS = [
  ["seatMapCaptures", "Capture<CapturedSeatMap>"],
  ["seatMapFailureCaptures", "Capture<readonly CapturedUpstreamError[]>"],
  ["showtimeGroupingCaptures", "Capture<CapturedShowtimeGrouping>"],
  ["theaterMovieShowtimesCaptures", "Capture<CapturedTheaterMovieShowtimes>"],
  ["nearbyTheatersCaptures", "Capture<CapturedNearbyTheaters>"],
];

const groupOf = (file) => {
  if (file.startsWith("seatmaps/"))
    return refused.has(file) ? "seatMapFailureCaptures" : "seatMapCaptures";
  if (file.startsWith("showtimes/grouping-")) return "showtimeGroupingCaptures";
  if (file.startsWith("showtimes/theater-showtimes-"))
    return "theaterMovieShowtimesCaptures";
  if (file.startsWith("theaters/")) return "nearbyTheatersCaptures";
  throw new Error(`No capture group for ${file}`);
};

const identifier = (file) => {
  const [head, ...rest] = basename(file, ".json").split(/[^A-Za-z0-9]+/);
  return (
    head.toLowerCase() +
    rest.map((part) => part[0].toUpperCase() + part.slice(1)).join("")
  );
};

const files = [...manifest.files].sort();
const members = new Map(GROUPS.map(([name]) => [name, []]));
for (const file of files) members.get(groupOf(file)).push(file);

const lines = [
  "import type {",
  "  Capture,",
  "  CapturedNearbyTheaters,",
  "  CapturedSeatMap,",
  "  CapturedShowtimeGrouping,",
  "  CapturedTheaterMovieShowtimes,",
  "  CapturedUpstreamError,",
  "  CorpusManifest,",
  '} from "./types.js";',
  'import manifest from "./manifest.json" with { type: "json" };',
  ...files.map(
    (file) =>
      `import ${identifier(file)} from "./${file}" with { type: "json" };`,
  ),
  "",
  "export const corpusManifest: CorpusManifest = manifest;",
];
for (const [name, body] of GROUPS) {
  lines.push(
    "",
    `export const ${name}: ReadonlyMap<string, ${body}> = new Map([`,
  );
  for (const file of members.get(name))
    lines.push(`  ["${file}", ${identifier(file)}],`);
  lines.push("]);");
}

await writeFile(join(corpus, "captures.ts"), `${lines.join("\n")}\n`);
console.log(
  `indexed ${files.length} captures into ${join(corpus, "captures.ts")}`,
);
