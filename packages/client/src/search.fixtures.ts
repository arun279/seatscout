import {
  type Catalogue,
  type Reading,
  type SeatProfile,
  type Showtime,
  type UnbookableReason,
  type Unidentified,
  narrowed,
  openSource,
} from "@seatscout/core";
import {
  type UpstreamScript,
  fakeUpstream,
  recordedCaptures,
  routeOf,
} from "@seatscout/core/testing";
import {
  type Coverage,
  type SearchTerms,
  type Snapshot,
  openSearch,
} from "./search.js";
import { type CachedCatalogue, inMemoryStore } from "./store.js";

export const SEAT_MAP = "/napi/seatMap/";
export const LISTING = "/napi/theaterShowtimeGroupings/245569/2026-08-28";
const AREA = "75006";
const TODAY = "2026-08-28";
const WIDE_RELEASE = "245569";
export const AT = 1000;
export const STONEBRIAR = "AMC Stonebriar 24";
export const INWOOD = "Landmark Inwood Theatre";
export const VILLAGE = "AMC Village on the Parkway 9";
export const WIDTH = 24;
const SEED = 4;

type Routes = NonNullable<UpstreamScript["routes"]>;

interface Options {
  readonly at?: readonly string[];
  readonly partySize?: number;
  readonly accessibleSeating?: boolean;
  readonly profile?: SeatProfile;
  readonly rooms?: readonly string[];
  readonly answers?: (bookable: readonly Showtime[]) => Routes;
  readonly script?: Omit<UpstreamScript, "seed" | "routes">;
  readonly cached?: (catalogue: Catalogue) => CachedCatalogue;
}

const payloadOf = <Found>(reading: Reading<Found>): Found => {
  if (!reading.ok) throw new Error(`the read answered ${reading.reason}`);
  return reading.payload;
};

const capturedRooms = () =>
  recordedCaptures().filter(
    (capture) =>
      capture.status === 200 &&
      routeOf(capture.request.path).startsWith(SEAT_MAP),
  );

const answered = (capture: { status: number; body: unknown }) => ({
  status: capture.status,
  body: JSON.stringify(capture.body),
});

const roomNamed = (showtime: string) => {
  const room = capturedRooms().find(
    (capture) => routeOf(capture.request.path) === `${SEAT_MAP}${showtime}`,
  );
  if (room === undefined) throw new Error(`${showtime} has no captured room`);
  return answered(room);
};

export const refusalNamed = (reason: string) => {
  const captured = recordedCaptures().find(
    (capture) =>
      capture.status !== 200 && JSON.stringify(capture.body).includes(reason),
  );
  if (captured === undefined) throw new Error(`${reason} was never captured`);
  return answered(captured);
};

const everyShowtime = (catalogue: Catalogue) => [
  ...catalogue.bookable,
  ...catalogue.unbookable.map((entry) => entry.showtime),
];

export const theaterIn = (
  catalogue: Catalogue,
  name: string,
): Showtime["presentation"]["theater"]["id"] => {
  const showtime = everyShowtime(catalogue).find(
    (entry) => entry.presentation.theater.name === name,
  );
  if (showtime === undefined) throw new Error(`${name} is not in this capture`);
  return showtime.presentation.theater.id;
};

const roomsFor = (
  bookable: readonly Showtime[],
  chosen?: readonly string[],
): Routes => {
  const rooms = capturedRooms();
  return Object.fromEntries(
    bookable.map((showtime, at) => {
      const named = chosen?.[at % chosen.length];
      const room = rooms[at % rooms.length];
      if (room === undefined) throw new Error("the corpus holds no rooms");
      return [
        `${SEAT_MAP}${showtime.id}`,
        named === undefined ? answered(room) : roomNamed(named),
      ];
    }),
  );
};

export const routesTo = (
  showtimes: readonly Showtime[],
  answer: { status: number; body: string },
): Routes =>
  Object.fromEntries(
    showtimes.map((showtime) => [`${SEAT_MAP}${showtime.id}`, answer]),
  );

export const listing = async () => {
  const source = openSource({
    fetch: fakeUpstream({ seed: 1 }),
    now: () => AT,
    wait: () => Promise.resolve(),
    random: () => 0.5,
  });
  return payloadOf(await source.showtimesFor(WIDE_RELEASE, TODAY, AREA));
};

export const searching = async (options: Options = {}) => {
  const listed = await listing();
  const terms: SearchTerms = {
    movie: WIDE_RELEASE,
    date: TODAY,
    area: AREA,
    partySize: options.partySize ?? 2,
    accessibleSeating: options.accessibleSeating ?? false,
    profile: options.profile,
    theaters: options.at?.map((name) => theaterIn(listed, name)),
  };
  const candidates = narrowed(listed, terms);
  const upstream = fakeUpstream({
    seed: SEED,
    ...options.script,
    routes: {
      ...roomsFor(candidates.bookable, options.rooms),
      ...options.answers?.(candidates.bookable),
    },
  });
  const store = inMemoryStore();
  if (options.cached !== undefined)
    await store.write("seed", options.cached(candidates));
  const search = openSearch({
    source: openSource({
      fetch: upstream,
      now: () => AT,
      wait: () => Promise.resolve(),
      random: () => 0.5,
    }),
    store:
      options.cached === undefined
        ? store
        : { read: () => store.read("seed"), write: () => Promise.resolve() },
    now: () => AT,
  })(terms);
  const snapshots: Snapshot[] = [];
  const frozen: string[] = [];
  search.subscribe(() => {
    snapshots.push(search.snapshot());
    frozen.push(JSON.stringify(search.snapshot()));
  });
  return {
    candidates,
    frozen,
    search,
    snapshots,
    requested: () =>
      upstream.requests
        .map((request) => request.path)
        .filter((path) => path.startsWith(SEAT_MAP))
        .map((path) => Number(path.slice(SEAT_MAP.length))),
  };
};

export const idsIn = (snapshot: Snapshot): Showtime["id"][] =>
  snapshot.results.map((result) => result.showtime.id);

export const arrivalIn = (snapshots: readonly Snapshot[]) => {
  const order: number[] = [];
  for (const snapshot of snapshots)
    for (const id of idsIn(snapshot)) if (!order.includes(id)) order.push(id);
  return order;
};

export const namedIn = (coverage: Coverage) => [
  ...coverage.soldOut,
  ...coverage.noSeatMap,
  ...coverage.started,
  ...coverage.salesOff,
  ...coverage.unidentified,
];

export const accountedIn = (coverage: Coverage) =>
  coverage.checked + namedIn(coverage).length + coverage.failed.length;

export const withoutIdentity = (showtime: Showtime): Unidentified => ({
  startsAt: showtime.startsAt,
  presentation: showtime.presentation,
  ticketing: showtime.ticketing,
});

export const stoppedSelling = (
  showtime: Showtime,
): { readonly showtime: Showtime; readonly reason: UnbookableReason } => ({
  showtime,
  reason: "salesOff",
});
