const HOST = process.env.SEATSCOUT_UPSTREAM_ORIGIN;
const AREA = process.env.SEATSCOUT_AREA;

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const PAUSE_MS = 500;
const ATTEMPTS = 3;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const named = (path) => path.split("?")[0];

let session = "";

async function reach(path, init) {
  try {
    return await fetch(`${HOST}${path}`, init);
  } catch {
    throw new Error(`${named(path)} could not be reached`);
  }
}

async function bootstrap() {
  const response = await reach("/napi/preferences/themes", {
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
  await sleep(PAUSE_MS * 2 ** (attempt - 1));
  const fetchedAt = Date.now();
  const response = await reach(path, {
    headers: { "User-Agent": UA, Cookie: session, Referer: `${HOST}/` },
  });
  const body = await response.text();
  if (response.status === 403 && attempt === 1) {
    await bootstrap();
    return answer(path, attempt + 1);
  }
  if (response.status >= 500 && attempt < ATTEMPTS)
    return answer(path, attempt + 1);
  return { status: response.status, body, fetchedAt };
}

function bodyOf(found, path) {
  if (found.status !== 200)
    throw new Error(`${named(path)} answered ${found.status}`);
  return JSON.parse(found.body);
}

const showtimeCountOf = (movie) =>
  (movie.variants ?? []).flatMap((variant) =>
    (variant.amenityGroups ?? []).flatMap((group) => group.showtimes ?? []),
  ).length;

const showtimesIn = (grouping) =>
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

function onePerChain(showtimes) {
  const chains = new Map();
  for (const showtime of showtimes)
    if (
      showtime.reserved &&
      !showtime.expired &&
      !showtime.soldOut &&
      !chains.has(showtime.chain)
    )
      chains.set(showtime.chain, showtime);
  return [...chains.values()];
}

const unbookableAmong = (showtimes) =>
  [
    showtimes.find((showtime) => !showtime.reserved),
    showtimes.find((showtime) => showtime.expired),
    showtimes.find((showtime) => showtime.soldOut),
  ].filter((showtime) => showtime !== undefined);

export default async function readTheLiveSource(project) {
  if (!HOST || !AREA)
    throw new Error(
      "Set SEATSCOUT_UPSTREAM_ORIGIN to the upstream aggregator's origin and SEATSCOUT_AREA to the area to read.",
    );

  await bootstrap();
  const today = new Date().toLocaleDateString("en-CA");

  const nearby = `/napi/nearbyTheaters?zipCode=${encodeURIComponent(AREA)}&limit=25`;
  const anchor = bodyOf(await answer(nearby), nearby).theaters[0];

  const listing = `/napi/theaterMovieShowtimes/${anchor.id.toLowerCase()}?chainCode=${anchor.chainCode}&startDate=${today}&isdesktop=true&partnerRestrictedTicketing=`;
  const movies = bodyOf(await answer(listing), listing).viewModel.movies;
  const widest = movies.reduce((most, movie) =>
    showtimeCountOf(movie) > showtimeCountOf(most) ? movie : most,
  );

  const grouping = `/napi/theaterShowtimeGroupings/${widest.id}/${today}?isdesktop=true&isDesktopMOP=true&zip=${encodeURIComponent(AREA)}&partnerRestrictedTicketing=`;
  const showtimes = showtimesIn(bodyOf(await answer(grouping), grouping));

  const seatMaps = [];
  for (const showtime of [
    ...onePerChain(showtimes),
    ...unbookableAmong(showtimes),
  ])
    seatMaps.push(await answer(`/napi/seatMap/${showtime.id}`));

  project.provide("liveSeatMaps", seatMaps);
  project.provide("liveSearch", {
    origin: HOST,
    area: AREA,
    movie: `${widest.id}`,
    date: today,
    headers: { "User-Agent": UA, Referer: `${HOST}/` },
  });
}
