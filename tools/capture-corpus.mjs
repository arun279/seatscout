#!/usr/bin/env node
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  LOCATION_PARAMS,
  REDACTED,
  redactBody,
  redactPath,
  redactSecrets,
  rememberedSecrets,
  rememberSecret,
} from "./corpus-redaction.mjs";
import {
  candidatesByChain,
  showtimeCount,
  showtimeRows,
  spreadOverTheaters,
} from "./corpus-rows.mjs";
import { shapeOf } from "./corpus-shape.mjs";
import { UPSTREAM_ORIGIN as HOST } from "./upstream.mjs";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const CAPTURED = ["manifest.json", "seatmaps", "showtimes", "theaters"];

const flags = Object.fromEntries(
  process.argv
    .slice(2)
    .flatMap((arg, i, all) =>
      arg.startsWith("--") ? [[arg.slice(2), all[i + 1] ?? true]] : [],
    ),
);
const config = {
  zip: flags.zip,
  date: flags.date ?? new Date().toLocaleDateString("en-CA"),
  movies: Number(flags.movies ?? 4),
  perChain: Number(flags["per-chain"] ?? 4),
  delayMs: Number(flags.delay ?? 500),
  out:
    flags.out ??
    join(
      dirname(fileURLToPath(import.meta.url)),
      "..",
      "packages",
      "core",
      "src",
      "corpus",
    ),
};
if (typeof config.zip !== "string")
  throw new Error("Pass --zip to say which area to capture.");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const previousDay = (date) =>
  new Date(`${date}T12:00:00Z`).valueOf() - 86400000;
const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);

async function bootstrapSession() {
  const response = await fetch(`${HOST}/napi/preferences/themes`, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      Origin: HOST,
      Referer: `${HOST}/`,
      "X-Requested-With": "XMLHttpRequest",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    body: `_expiry=${Date.now()}`,
  });
  const setCookies = response.headers.getSetCookie();
  await response.body?.cancel();
  if (response.status !== 200)
    throw new Error(`bootstrap returned ${response.status}`);

  for (const raw of setCookies) {
    const pair = raw.split(";")[0];
    const value = pair.slice(pair.indexOf("=") + 1);
    rememberSecret(pair);
    rememberSecret(value);
    rememberSecret(decodeURIComponent(value));
    for (const number of decodeURIComponent(value).match(/-?\d+\.\d+/g) ?? [])
      rememberSecret(number);
  }
  return setCookies.map((raw) => raw.split(";")[0]).join("; ");
}

let cookie = await bootstrapSession();
const ledger = [];

async function get(path, { attempt = 1 } = {}) {
  await sleep(config.delayMs);
  const response = await fetch(`${HOST}${path}`, {
    headers: {
      "User-Agent": UA,
      Cookie: cookie,
      Referer: `${HOST}/`,
      "X-Requested-With": "XMLHttpRequest",
    },
  });
  const text = await response.text();
  ledger.push({ path: redactPath(path), status: response.status, attempt });

  if (response.status === 403 && attempt === 1) {
    cookie = await bootstrapSession();
    return get(path, { attempt: attempt + 1 });
  }
  if (response.status >= 500 && attempt <= 3) {
    await sleep(config.delayMs * 2 ** attempt);
    return get(path, { attempt: attempt + 1 });
  }
  return { status: response.status, body: JSON.parse(text) };
}

const written = [];
async function writeFixture(relativePath, path, capture) {
  const envelope = {
    capturedAt: new Date().toISOString(),
    request: { method: "GET", path: redactPath(path) },
    status: capture.status,
    body: redactBody(capture.body),
  };
  const target = join(config.out, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(
    target,
    `${redactSecrets(JSON.stringify(envelope, null, 2))}\n`,
  );
  written.push(relativePath);
  return envelope;
}

for (const stale of CAPTURED)
  await rm(join(config.out, stale), { recursive: true, force: true });

const nearbyPath = `/napi/nearbyTheaters?zipCode=${config.zip}&limit=25`;
const nearby = await get(nearbyPath);
await writeFixture("theaters/nearby-theaters.json", nearbyPath, nearby);

const anchor = nearby.body.theaters[0];
const anchorId = anchor.id.toLowerCase();
const cataloguePath = `/napi/theaterMovieShowtimes/${anchorId}?chainCode=${anchor.chainCode}&startDate=${config.date}&isdesktop=true&partnerRestrictedTicketing=`;
const catalogue = await get(cataloguePath);
await writeFixture(
  `showtimes/theater-showtimes-${anchorId}-${config.date}.json`,
  cataloguePath,
  catalogue,
);

const widestReleases = [...catalogue.body.viewModel.movies]
  .sort((a, b) => showtimeCount(b) - showtimeCount(a))
  .slice(0, config.movies);

const groupingPath = (movieId, date) =>
  `/napi/theaterShowtimeGroupings/${movieId}/${date}?isdesktop=true&isDesktopMOP=true&zip=${config.zip}&partnerRestrictedTicketing=`;

const groupings = [];
for (const movie of widestReleases) {
  const path = groupingPath(movie.id, config.date);
  const grouping = await get(path);
  await writeFixture(
    `showtimes/grouping-${movie.id}-${config.date}.json`,
    path,
    grouping,
  );
  groupings.push({ movieId: movie.id, body: grouping.body });
}

const widest = groupings
  .map((grouping) => ({
    ...grouping,
    chains: new Set(
      (grouping.body.theaterShowtimes?.theaters ?? []).map(
        (theater) => theater.chainCode,
      ),
    ).size,
  }))
  .sort((a, b) => b.chains - a.chains)[0];

const pastDate = isoDay(previousDay(config.date));
const pastPath = groupingPath(widest.movieId, pastDate);
const pastGrouping = await get(pastPath);
await writeFixture(
  `showtimes/grouping-${widest.movieId}-${pastDate}.json`,
  pastPath,
  pastGrouping,
);

const seatMaps = [];
const captureSeatMap = async (candidate) => {
  const path = `/napi/seatMap/${candidate.showtimeId}`;
  const capture = await get(path);
  const relativePath = `seatmaps/${candidate.chain}-${candidate.theaterId}-${candidate.showtimeId}.json`;
  await writeFixture(relativePath, path, capture);
  seatMaps.push({
    file: relativePath,
    ...candidate,
    httpStatus: capture.status,
    auditoriumId: capture.body.auditoriumId ?? null,
    ...(capture.status === 200
      ? shapeOf(capture.body)
      : { upstreamError: capture.body }),
  });
};

const rows = [
  ...showtimeRows(groupings),
  ...showtimeRows([{ movieId: widest.movieId, body: pastGrouping.body }]),
];

for (const [chain, candidates] of candidatesByChain(rows)) {
  for (const candidate of spreadOverTheaters(candidates, config.perChain))
    await captureSeatMap(candidate);
  process.stderr.write(`${chain} `);
}

for (const type of ["soldout", "pastshowtime"]) {
  const row = rows.find((entry) => entry.showtimeType === type);
  if (row) await captureSeatMap(row);
}

const manifest = {
  capturedAt: new Date().toISOString(),
  config: {
    zip: REDACTED,
    date: config.date,
    movies: config.movies,
    perChain: config.perChain,
    delayMs: config.delayMs,
  },
  redaction: {
    rule: "response headers are never written; location query parameters and every bootstrap cookie value are replaced",
    locationQueryParams: [...LOCATION_PARAMS],
    strippedBodyFields: ["distance"],
    secretCount: rememberedSecrets().length,
  },
  chains: [...new Set(seatMaps.map((entry) => entry.chain))].sort(),
  chainsNearbyWithoutSeatMaps: [
    ...new Set(nearby.body.theaters.map((theater) => theater.chainCode)),
  ]
    .filter((chain) => !seatMaps.some((entry) => entry.chain === chain))
    .sort(),
  requestLedger: ledger,
  showtimeTypeCounts: rows.reduce(
    (acc, row) =>
      Object.assign(acc, {
        [row.showtimeType]: (acc[row.showtimeType] ?? 0) + 1,
      }),
    {},
  ),
  seatMaps,
  files: written.sort(),
};
await writeFile(
  join(config.out, "manifest.json"),
  `${redactSecrets(JSON.stringify(manifest, null, 2))}\n`,
);

const walk = async (dir) =>
  (
    await Promise.all(
      (
        await readdir(dir, { withFileTypes: true })
      ).map((entry) =>
        entry.isDirectory()
          ? walk(join(dir, entry.name))
          : [join(dir, entry.name)],
      ),
    )
  ).flat();

const searchArea = new RegExp(String.raw`\b${config.zip}\b`);
const leaks = [];
for (const file of await walk(config.out)) {
  const text = await readFile(file, "utf8");
  for (const secret of rememberedSecrets())
    if (text.includes(secret)) leaks.push(`${file}: ${secret.slice(0, 24)}...`);
  if (searchArea.test(text)) leaks.push(`${file}: the area passed to --zip`);
}
if (leaks.length) {
  console.error(`REDACTION FAILED\n${leaks.join("\n")}`);
  process.exit(1);
}

const ok = seatMaps.filter((entry) => entry.httpStatus === 200);
console.log(`
chains          ${manifest.chains.join(" ")}
seat maps       ${ok.length} captured, ${seatMaps.length - ok.length} non-200
auditoriums     ${new Set(ok.map((entry) => `${entry.theaterId}/${entry.auditoriumId}`)).size} distinct
seat counts     ${Math.min(...ok.map((entry) => entry.seatsInArray))} to ${Math.max(...ok.map((entry) => entry.seatsInArray))}
raw statuses    ${[...new Set(ok.flatMap((entry) => Object.keys(entry.rawSeatStatusCounts)))].sort().join(" ")}
geometry        ${ok.every((entry) => entry.hasGeometry) ? "present in every seat" : "MISSING"}
neighbours      ${ok.every((entry) => entry.hasNeighbourLinks) ? "present in every seat" : "MISSING"}
showtime types  ${JSON.stringify(manifest.showtimeTypeCounts)}
requests        ${ledger.length}, non-200: ${ledger.filter((entry) => entry.status !== 200).length}
redaction       ${rememberedSecrets().length} secret values checked against ${written.length + 1} files, no leak
written to      ${config.out}
`);
