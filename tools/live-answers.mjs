const HOST = process.env.SEATSCOUT_UPSTREAM_ORIGIN;
const AREA = process.env.SEATSCOUT_AREA;

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const PAUSE_MS = 1000;
const ATTEMPTS = 3;
const CHAINS = 8;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let session = "";

async function bootstrap() {
  const response = await fetch(`${HOST}/napi/preferences/themes`, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      Referer: `${HOST}/`,
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    body: `_expiry=${Date.now()}`,
  });
  await response.body?.cancel();
  if (response.status !== 200)
    throw new Error(`the bootstrap answered ${response.status}`);
  session = response.headers
    .getSetCookie()
    .map((raw) => raw.split(";")[0])
    .join("; ");
}

async function answer(path, attempt = 1) {
  await sleep(PAUSE_MS);
  const fetchedAt = Date.now();
  const response = await fetch(`${HOST}${path}`, {
    headers: { "User-Agent": UA, Cookie: session, Referer: `${HOST}/` },
  });
  const body = await response.text();
  if (response.status >= 500 && attempt < ATTEMPTS)
    return answer(path, attempt + 1);
  return { status: response.status, body, fetchedAt };
}

function bodyOf(found, path) {
  if (found.status !== 200)
    throw new Error(
      `${path} answered ${found.status}: ${found.body.slice(0, 200)}`,
    );
  return JSON.parse(found.body);
}

const showtimesIn = (movie) =>
  (movie.variants ?? []).flatMap((variant) =>
    (variant.amenityGroups ?? []).flatMap((group) => group.showtimes ?? []),
  );

const rowsIn = (grouping) =>
  (grouping.theaterShowtimes?.theaters ?? []).flatMap((theater) =>
    (theater.variants ?? []).flatMap((variant) =>
      (variant.amenityGroups ?? []).flatMap((group) =>
        (group.showtimes ?? []).flatMap((showtime) =>
          showtime.id === undefined
            ? []
            : [
                {
                  chain: theater.chainCode,
                  id: showtime.id,
                  reserved: group.hasReservedSeating,
                  expired: showtime.expired,
                  soldOut: showtime.isSoldOut,
                },
              ],
        ),
      ),
    ),
  );

function spreadOverChains(rows) {
  const byChain = new Map();
  for (const row of rows)
    if (row.reserved && !row.expired && !row.soldOut && !byChain.has(row.chain))
      byChain.set(row.chain, row);
  return [...byChain.values()].slice(0, CHAINS);
}

const refusalsAmong = (rows) =>
  [
    rows.find((row) => !row.reserved),
    rows.find((row) => row.expired),
    rows.find((row) => row.soldOut),
  ].filter((row) => row !== undefined);

export default async function readTheLiveSource(project) {
  if (!HOST || !AREA)
    throw new Error(
      "Set SEATSCOUT_UPSTREAM_ORIGIN to the upstream aggregator's origin and SEATSCOUT_AREA to the area to read.",
    );

  await bootstrap();
  const today = new Date().toLocaleDateString("en-CA");

  const nearby = `/napi/nearbyTheaters?zipCode=${encodeURIComponent(AREA)}&limit=25`;
  const theaters = await answer(nearby);
  const anchor = bodyOf(theaters, nearby).theaters[0];

  const listing = `/napi/theaterMovieShowtimes/${anchor.id.toLowerCase()}?chainCode=${anchor.chainCode}&startDate=${today}&isdesktop=true&partnerRestrictedTicketing=`;
  const movies = bodyOf(await answer(listing), listing).viewModel.movies;
  const widest = movies.reduce((most, movie) =>
    showtimesIn(movie).length > showtimesIn(most).length ? movie : most,
  );

  const grouping = `/napi/theaterShowtimeGroupings/${widest.id}/${today}?isdesktop=true&isDesktopMOP=true&zip=${encodeURIComponent(AREA)}&partnerRestrictedTicketing=`;
  const catalogue = await answer(grouping);
  const rows = rowsIn(bodyOf(catalogue, grouping));

  const seatMaps = [];
  for (const row of [...spreadOverChains(rows), ...refusalsAmong(rows)])
    seatMaps.push(await answer(`/napi/seatMap/${row.id}`));

  project.provide("liveSeatMaps", seatMaps);
}
