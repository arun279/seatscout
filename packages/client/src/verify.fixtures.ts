import {
  type Catalogue,
  type Reading,
  type SeatProfile,
  type Showtime,
  narrowed,
  openSource,
} from "@seatscout/core";
import {
  type FakeUpstream,
  type UpstreamScript,
  fakeUpstream,
  recordedCaptures,
  routeOf,
  seatMapCaptures,
} from "@seatscout/core/testing";
import type { SeatGroupResult } from "./ranking.js";
import { type SearchTerms, openSearch } from "./search.js";
import { type KeyValueStore, inMemoryStore } from "./store.js";
import { type Verified, openVerification } from "./verify.js";

export const SEAT_MAP = "/napi/seatMap/";
export const LISTING = "/napi/theaterShowtimeGroupings/245569/2026-08-28";
export const AREA = "75006";
export const TODAY = "2026-08-28";
export const WIDE_RELEASE = "245569";
const STONEBRIAR = "AMC Stonebriar 24";
const ROOM = "561562311";
export const ACCESSIBLE_ROOM = "561898261";
export const POD_ROOM = "561748075";
export const SEARCHED_AT = 1000;
export const VERIFIED_AT = 61000;
export const AN_HOUR = 60 * 60 * 1000;
const SEED = 4;

interface Answer {
  readonly status: number;
  readonly body: string;
}

type Script = Omit<UpstreamScript, "seed" | "routes">;

interface Options {
  readonly accessibleSeating?: boolean;
  readonly formats?: SearchTerms["formats"];
  readonly partySize?: number;
  readonly profile?: SeatProfile;
  readonly room?: string;
  readonly answer?: (result: SeatGroupResult, room: string) => Answer;
  readonly searchedIn?: (room: string) => Answer;
  readonly script?: (bookable: readonly Showtime[]) => Script;
  readonly at?: number;
  readonly store?: (listed: Catalogue) => KeyValueStore;
}

const payloadOf = <Found>(reading: Reading<Found>): Found => {
  if (!reading.ok) throw new Error(`the read answered ${reading.reason}`);
  return reading.payload;
};

const sourceAt = (fetch: ReturnType<typeof fakeUpstream>, now: number) =>
  openSource({
    fetch,
    now: () => now,
    wait: () => Promise.resolve(),
    random: () => 0.5,
  });

const capturedRoom = (room: string) => {
  const captured = [...seatMapCaptures.values()].find(
    (capture) => routeOf(capture.request.path) === `${SEAT_MAP}${room}`,
  );
  if (captured === undefined) throw new Error(`${room} has no captured room`);
  return captured;
};

export const roomWhere = (
  room: string,
  statuses: Readonly<Record<string, string>> = {},
): Answer => {
  const captured = capturedRoom(room);
  return {
    status: captured.status,
    body: JSON.stringify({
      ...captured.body,
      seats: captured.body.seats.map((seat) => ({
        ...seat,
        status: statuses[seat.id] ?? seat.status,
      })),
    }),
  };
};

export const refusalNamed = (reason: string): Answer => {
  const captured = recordedCaptures().find(
    (capture) =>
      capture.status !== 200 && JSON.stringify(capture.body).includes(reason),
  );
  if (captured === undefined) throw new Error(`${reason} was never captured`);
  return { status: captured.status, body: JSON.stringify(captured.body) };
};

const roomsFor = (bookable: readonly Showtime[], answer: Answer) =>
  Object.fromEntries(
    bookable.map((showtime) => [`${SEAT_MAP}${showtime.id}`, answer]),
  );

export const refusing = (bookable: readonly Showtime[]): Script => ({
  sequences: Object.fromEntries(
    bookable.map((showtime) => [`${SEAT_MAP}${showtime.id}`, [500, 500, 500]]),
  ),
});

const listing = async () => {
  const source = sourceAt(fakeUpstream({ seed: 1 }), SEARCHED_AT);
  return payloadOf(await source.showtimesFor(WIDE_RELEASE, TODAY, AREA));
};

const theaterIn = (catalogue: Catalogue, name: string) => {
  const showtime = catalogue.bookable.find(
    (entry) => entry.presentation.theater.name === name,
  );
  if (showtime === undefined) throw new Error(`${name} is not in this capture`);
  return showtime.presentation.theater.id;
};

export const holding = (entry: unknown): KeyValueStore => ({
  read: () => Promise.resolve(entry),
  write: () => Promise.resolve(),
});

export const seatsIn = (result: SeatGroupResult) =>
  result.seats.map((seat) => seat.id);

const firstSeatOf = (result: SeatGroupResult) => {
  const [seat] = seatsIn(result);
  if (seat === undefined) throw new Error("the Seat Group holds no Seat");
  return seat;
};

export const withoutTheFirstSeat = (result: SeatGroupResult, room: string) =>
  roomWhere(room, { [firstSeatOf(result)]: "X" });

export const alternativesIn = (verified: Verified) =>
  verified.ok ? [] : verified.alternatives;

const searching = async (options: Options) => {
  const listed = await listing();
  const terms: SearchTerms = {
    movie: WIDE_RELEASE,
    date: TODAY,
    area: AREA,
    partySize: options.partySize ?? 2,
    accessibleSeating: options.accessibleSeating ?? false,
    profile: options.profile,
    theaters: [theaterIn(listed, STONEBRIAR)],
    formats: options.formats,
  };
  const candidates = narrowed(listed, terms);
  const room = options.room ?? ROOM;
  const warm = inMemoryStore();
  const searched = await openSearch({
    source: sourceAt(
      fakeUpstream({
        seed: SEED,
        routes: {
          ...roomsFor(
            candidates.bookable,
            options.searchedIn?.(room) ?? roomWhere(room),
          ),
        },
      }),
      SEARCHED_AT,
    ),
    store: warm,
    now: () => SEARCHED_AT,
  })(terms).done;
  const result = searched.results[0];
  if (result === undefined) throw new Error("the search offered no result");
  return { listed, candidates, room, warm, result };
};

export const verifying = async (options: Options = {}) => {
  const { listed, candidates, room, warm, result } = await searching(options);
  const upstream = fakeUpstream({
    seed: SEED,
    ...options.script?.(candidates.bookable),
    routes: {
      ...roomsFor(
        candidates.bookable,
        options.answer?.(result, room) ?? roomWhere(room),
      ),
    },
  });
  const at = options.at ?? VERIFIED_AT;
  const verify = openVerification({
    source: sourceAt(upstream, at),
    store: options.store?.(candidates) ?? warm,
    now: () => at,
  });
  return {
    listed,
    result,
    verify: () => verify(result),
    requested: () => upstream.requests.map((request) => request.path),
    auditoriumsRead: (): FakeUpstream["requests"] =>
      upstream.requests.filter((request) => request.path.startsWith(SEAT_MAP)),
  };
};
