import type { Answer } from "@seatscout/core/live-context";
import type { TestProject } from "vitest/node";
import { UPSTREAM_ORIGIN as HOST } from "./upstream.ts";

interface UpstreamAmenityGroup {
  readonly hasReservedSeating?: boolean;
  readonly showtimes?: readonly {
    readonly id?: string;
    readonly expired?: boolean;
    readonly isSoldOut?: boolean;
  }[];
}

interface UpstreamShowtimes {
  readonly variants?: readonly {
    readonly amenityGroups?: readonly UpstreamAmenityGroup[];
  }[];
}

interface SeatMapTarget {
  readonly chain: string;
  readonly id: string;
  readonly reserved: boolean | undefined;
  readonly expired: boolean | undefined;
  readonly soldOut: boolean | undefined;
}

interface UpstreamArea {
  readonly theaters: readonly { readonly id: string }[];
}

interface UpstreamSchedule {
  readonly viewModel: {
    readonly movies: readonly (UpstreamShowtimes & { readonly id: string })[];
  };
}

interface UpstreamGrouping {
  readonly theaterShowtimes?: {
    readonly theaters?: readonly (UpstreamShowtimes & {
      readonly chainCode: string;
    })[];
  };
}

const ANCHOR_THEATER_ZIP = "75234";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const PAUSE_MS = 500;
const ATTEMPTS = 3;
const FROM_QUESTION_MARK = /\?.*$/;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const named = (path: string): string => path.replace(FROM_QUESTION_MARK, "");

async function reach(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`${HOST}${path}`, init);
  } catch {
    throw new Error(`${named(path)} could not be reached`);
  }
}

async function answer(path: string, attempt = 1): Promise<Answer> {
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

function bodyOf<Body>(found: Answer, path: string): Body {
  if (found.status !== 200)
    throw new Error(`${named(path)} answered ${found.status}`);
  return JSON.parse(found.body);
}

const showtimeCountOf = (movie: UpstreamShowtimes): number =>
  (movie.variants ?? []).flatMap((variant) =>
    (variant.amenityGroups ?? []).flatMap((group) => group.showtimes ?? []),
  ).length;

const seatMapTargetsIn = (
  grouping: UpstreamGrouping,
): readonly SeatMapTarget[] =>
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

function onePerChain(
  showtimes: readonly SeatMapTarget[],
): readonly SeatMapTarget[] {
  const chains = new Map<string, SeatMapTarget>();
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

const unbookableAmong = (
  showtimes: readonly SeatMapTarget[],
): readonly SeatMapTarget[] =>
  [
    showtimes.find((showtime) => !showtime.reserved),
    showtimes.find((showtime) => showtime.expired),
    showtimes.find((showtime) => showtime.soldOut),
  ].filter((showtime) => showtime !== undefined);

export default async function readTheLiveSource(
  project: TestProject,
): Promise<void> {
  const today = new Date().toLocaleDateString("en-CA");

  const nearby = `/napi/nearbyTheaters?zipCode=${encodeURIComponent(ANCHOR_THEATER_ZIP)}&limit=25`;
  const area = await answer(nearby);
  const anchor = bodyOf<UpstreamArea>(area, nearby).theaters[0];
  if (anchor === undefined)
    throw new Error(`${named(nearby)} answered no Theater to anchor on`);

  const schedule = `/napi/theaterMovieShowtimes/${anchor.id.toLowerCase()}?startDate=${today}&isdesktop=true&partnerRestrictedTicketing=`;
  const scheduled = await answer(schedule);
  const movies = bodyOf<UpstreamSchedule>(scheduled, schedule).viewModel.movies;
  if (movies.length === 0)
    throw new Error(`${named(schedule)} answered no Movie to read`);
  const widest = movies.reduce((most, movie) =>
    showtimeCountOf(movie) > showtimeCountOf(most) ? movie : most,
  );

  const grouping = `/napi/theaterShowtimeGroupings/${widest.id}/${today}?isdesktop=true&isDesktopMOP=true&zip=${encodeURIComponent(ANCHOR_THEATER_ZIP)}&partnerRestrictedTicketing=`;
  const listing = await answer(grouping);
  const showtimes = seatMapTargetsIn(
    bodyOf<UpstreamGrouping>(listing, grouping),
  );

  const seatMaps: Answer[] = [];
  for (const showtime of [
    ...onePerChain(showtimes),
    ...unbookableAmong(showtimes),
  ])
    seatMaps.push(await answer(`/napi/seatMap/${showtime.id}`));

  project.provide("liveSeatMaps", seatMaps);
  project.provide("liveArea", area);
  project.provide("liveSchedule", scheduled);
  project.provide("liveListing", listing);
  project.provide("liveSearch", {
    origin: HOST,
    area: ANCHOR_THEATER_ZIP,
    movie: widest.id,
    date: today,
    headers: { "User-Agent": UA, Referer: `${HOST}/` },
  });
}
