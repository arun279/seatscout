import { UPSTREAM_ORIGIN as HOST } from "./upstream.mjs";

const ANCHOR_THEATER_ZIP = "75234";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const PAUSE_MS = 500;
const ATTEMPTS = 3;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const named = (path) => path.split("?")[0];

async function reach(path, init) {
  try {
    return await fetch(`${HOST}${path}`, init);
  } catch {
    throw new Error(`${named(path)} could not be reached`);
  }
}

async function answer(path, attempt = 1) {
  await sleep(PAUSE_MS * 2 ** (attempt - 1));
  const fetchedAt = Date.now();
  const response = await reach(path, {
    headers: { "User-Agent": UA, Referer: `${HOST}/` },
  });
  const body = await response.text();
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

const seatMapTargetsIn = (grouping) =>
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
  const today = new Date().toLocaleDateString("en-CA");

  const nearby = `/napi/nearbyTheaters?zipCode=${encodeURIComponent(ANCHOR_THEATER_ZIP)}&limit=25`;
  const area = await answer(nearby);
  const anchor = bodyOf(area, nearby).theaters[0];

  const schedule = `/napi/theaterMovieShowtimes/${anchor.id.toLowerCase()}?chainCode=${anchor.chainCode}&startDate=${today}&isdesktop=true&partnerRestrictedTicketing=`;
  const movies = bodyOf(await answer(schedule), schedule).viewModel.movies;
  const widest = movies.reduce((most, movie) =>
    showtimeCountOf(movie) > showtimeCountOf(most) ? movie : most,
  );

  const grouping = `/napi/theaterShowtimeGroupings/${widest.id}/${today}?isdesktop=true&isDesktopMOP=true&zip=${encodeURIComponent(ANCHOR_THEATER_ZIP)}&partnerRestrictedTicketing=`;
  const listing = await answer(grouping);
  const showtimes = seatMapTargetsIn(bodyOf(listing, grouping));

  const seatMaps = [];
  for (const showtime of [
    ...onePerChain(showtimes),
    ...unbookableAmong(showtimes),
  ])
    seatMaps.push(await answer(`/napi/seatMap/${showtime.id}`));

  project.provide("liveSeatMaps", seatMaps);
  project.provide("liveArea", area);
  project.provide("liveListing", listing);
  project.provide("liveSearch", {
    origin: HOST,
    area: ANCHOR_THEATER_ZIP,
    movie: `${widest.id}`,
    date: today,
    headers: { "User-Agent": UA, Referer: `${HOST}/` },
  });
}
