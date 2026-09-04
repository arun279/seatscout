import {
  nearbyTheatersCaptures,
  showtimeGroupingCaptures,
} from "../corpus/captures.js";
import type {
  CapturedShowtime,
  CapturedShowtimeGrouping,
} from "../corpus/types.js";
import type {
  Catalogue,
  Showtime,
  UnbookableReason,
  Unidentified,
} from "../domain/catalogue.js";
import {
  type FakeUpstream,
  fakeUpstream,
  type UpstreamScript,
} from "../testing/fake-upstream.js";
import { openSource } from "./aggregator.js";
import type { Reading, Source } from "./port.js";

export const NEARBY = "/napi/nearbyTheaters";
export const AREA = "75006";
export const TODAY = "2026-08-28";
export const WIDE_RELEASE = "245569";
export const GROUPINGS = [
  ["243819", TODAY],
  [WIDE_RELEASE, "2026-08-27"],
  [WIDE_RELEASE, TODAY],
  ["246329", TODAY],
  ["246427", TODAY],
] as const;

export const rig = (
  script: Omit<UpstreamScript, "seed"> = {},
): { readonly fetch: FakeUpstream; readonly source: Source } => {
  const fetch = fakeUpstream({
    seed: 4,
    ...script,
    routes: script.routes,
  });
  return {
    fetch,
    source: openSource({
      fetch,
      now: () => 1000,
      wait: () => Promise.resolve(),
      random: () => 0.5,
    }),
  };
};

export const sourced = (script: Omit<UpstreamScript, "seed"> = {}): Source =>
  rig(script).source;

export const payloadOf = <Found>(reading: Reading<Found>): Found => {
  if (!reading.ok) throw new Error(`the Source answered ${reading.reason}`);
  return reading.payload;
};

export const catalogueOf = async (
  movie: string,
  date: string,
): Promise<Catalogue> =>
  payloadOf(await sourced().showtimesFor(movie, date, AREA));

export const everyShowtime = (
  catalogue: Catalogue,
): readonly (Showtime | Unidentified)[] => [
  ...catalogue.bookable,
  ...catalogue.unbookable.map((entry) => entry.showtime),
  ...catalogue.unidentified,
];

export const counted = (catalogue: Catalogue, reason: UnbookableReason) =>
  catalogue.unbookable.filter((entry) => entry.reason === reason).length;

export const grouping = (movie: string, date: string) =>
  `/napi/theaterShowtimeGroupings/${movie}/${date}`;

export const groupingCapture = (movie: string, date: string) => {
  const capture = showtimeGroupingCaptures.get(
    `showtimes/grouping-${movie}-${date}.json`,
  );
  if (capture === undefined)
    throw new Error(`${movie} on ${date} was never captured`);
  return capture.body;
};

export const nearbyCapture = () => {
  const capture = nearbyTheatersCaptures.get("theaters/nearby-theaters.json");
  if (capture === undefined)
    throw new Error("nearby theaters were not captured");
  return capture.body;
};

export type CapturedTheaters =
  CapturedShowtimeGrouping["theaterShowtimes"]["theaters"];

export const capturedRows = (
  theaters: CapturedTheaters,
): readonly CapturedShowtime[] =>
  theaters.flatMap((theater) =>
    theater.variants.flatMap((variant) =>
      variant.amenityGroups.flatMap((group) => group.showtimes),
    ),
  );

export type Named = readonly [string, unknown];

const rewritten = (
  value: unknown,
  change: (entry: Named) => readonly Named[],
): unknown => {
  if (Array.isArray(value)) return value.map((item) => rewritten(item, change));
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, nested]) =>
      change([key, rewritten(nested, change)]),
    ),
  );
};

export const without = (value: unknown, field: string) =>
  rewritten(value, ([key, nested]) => (key === field ? [] : [[key, nested]]));

export const instead = (value: unknown, field: string, to: unknown) =>
  rewritten(value, ([key, nested]) => [[key, key === field ? to : nested]]);

export const alongside = (value: unknown, field: string, item: unknown) =>
  rewritten(value, ([key, nested]) => [
    [key, key === field && Array.isArray(nested) ? [...nested, item] : nested],
  ]);

export const answering = (route: string, body: unknown) => ({
  routes: { [route]: { status: 200, body: JSON.stringify(body) } },
});

export const THEATERS_THE_SOURCE_STOPPED_IDENTIFYING = [
  "AMC NorthPark 15",
  "AMC Village on the Parkway 9",
  "Cinemark Central Plano",
  "Cinemark Dallas XD and IMAX",
  "Cinemark Frisco Square and XD",
  "Cinemark Legacy and XD",
  "Cinemark Lewisville and XD",
  "Cinemark Tinseltown Grapevine and XD",
  "Cinemark West Plano and XD",
];

const rowsRewritten = (
  theater: CapturedTheaters[number],
  change: (showtimes: unknown) => unknown,
) => ({
  ...theater,
  variants: theater.variants.map((variant) => ({
    ...variant,
    amenityGroups: variant.amenityGroups.map((group) => ({
      ...group,
      showtimes: change(group.showtimes),
    })),
  })),
});

export const asTheSourceAnswersFor = (
  theaters: readonly string[],
  change: (showtimes: unknown) => unknown,
): unknown => {
  const capture = groupingCapture(WIDE_RELEASE, TODAY);
  return {
    theaterShowtimes: {
      ...capture.theaterShowtimes,
      theaters: capture.theaterShowtimes.theaters.map((theater) =>
        theaters.includes(theater.name)
          ? rowsRewritten(theater, change)
          : theater,
      ),
    },
  };
};

export const asTheSourceAnsweredIt = (): unknown =>
  asTheSourceAnswersFor(THEATERS_THE_SOURCE_STOPPED_IDENTIFYING, (showtimes) =>
    without(showtimes, "id"),
  );

export const readingOf = (body: unknown) =>
  sourced(answering(grouping(WIDE_RELEASE, TODAY), body)).showtimesFor(
    WIDE_RELEASE,
    TODAY,
    AREA,
  );
