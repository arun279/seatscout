import {
  type Catalogue,
  REFERENCE,
  type Reading,
  type SeatProfile,
  type Showtime,
  type TicketingUrl,
  narrowed,
  openSource,
} from "@seatscout/core";
import {
  type UpstreamScript,
  fakeUpstream,
  recordedCaptures,
  routeOf,
  seatMapCaptures,
} from "@seatscout/core/testing";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { SeatGroupResult } from "./ranking.js";
import { type SearchTerms, openSearch } from "./search.js";
import { type KeyValueStore, inMemoryStore } from "./store.js";
import { type Verified, openVerification } from "./verify.js";

const BOOTSTRAP = "/napi/preferences/themes";
const SEAT_MAP = "/napi/seatMap/";
const LISTING = "/napi/theaterShowtimeGroupings/245569/2026-08-28";
const AREA = "75006";
const TODAY = "2026-08-28";
const WIDE_RELEASE = "245569";
const STONEBRIAR = "AMC Stonebriar 24";
const ROOM = "561562311";
const ACCESSIBLE_ROOM = "561898261";
const POD_ROOM = "561748075";
const SEARCHED_AT = 1000;
const VERIFIED_AT = 61000;
const AN_HOUR = 60 * 60 * 1000;
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

const SESSION: Answer = { status: 200, body: "{}" };

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

const roomWhere = (
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

const refusalNamed = (reason: string): Answer => {
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

const refusing = (bookable: readonly Showtime[]): Script => ({
  sequences: Object.fromEntries(
    bookable.map((showtime) => [`${SEAT_MAP}${showtime.id}`, [500, 500, 500]]),
  ),
});

const listing = async () => {
  const source = sourceAt(
    fakeUpstream({ seed: 1, routes: { [BOOTSTRAP]: SESSION } }),
    SEARCHED_AT,
  );
  return payloadOf(await source.showtimesFor(WIDE_RELEASE, TODAY, AREA));
};

const theaterIn = (catalogue: Catalogue, name: string) => {
  const showtime = catalogue.bookable.find(
    (entry) => entry.presentation.theater.name === name,
  );
  if (showtime === undefined) throw new Error(`${name} is not in this capture`);
  return showtime.presentation.theater.id;
};

const holding = (entry: unknown): KeyValueStore => ({
  read: () => Promise.resolve(entry),
  write: () => Promise.resolve(),
});

const seatsIn = (result: SeatGroupResult) =>
  result.seats.map((seat) => seat.id);

const firstSeatOf = (result: SeatGroupResult) => {
  const [seat] = seatsIn(result);
  if (seat === undefined) throw new Error("the Seat Group holds no Seat");
  return seat;
};

const withoutTheFirstSeat = (result: SeatGroupResult, room: string) =>
  roomWhere(room, { [firstSeatOf(result)]: "X" });

const alternativesIn = (verified: Verified) =>
  verified.ok ? [] : verified.alternatives;

const verifying = async (options: Options = {}) => {
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
          [BOOTSTRAP]: SESSION,
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
  const upstream = fakeUpstream({
    seed: SEED,
    ...options.script?.(candidates.bookable),
    routes: {
      [BOOTSTRAP]: SESSION,
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
    auditoriumsRead: () =>
      upstream.requests.filter((request) => request.path.startsWith(SEAT_MAP)),
  };
};

describe("re-verifying a Seat Group", () => {
  it("hands back the ticketing URL the listing carried for that Showtime and no other", async () => {
    const run = await verifying();
    const verified = await run.verify();
    const listed = [
      ...run.listed.bookable,
      ...run.listed.unbookable.map((entry) => entry.showtime),
    ];
    const supplied = listed
      .filter((showtime) => showtime.id === run.result.showtime.id)
      .map((showtime) => showtime.ticketing);
    const elsewhere = listed
      .filter((showtime) => showtime.id !== run.result.showtime.id)
      .map((showtime) => showtime.ticketing);

    expect(supplied).toHaveLength(1);
    expect(verified.ok && verified.ticketing).toBe(supplied[0]);
    expect(elsewhere).toHaveLength(175);
    expect(elsewhere).not.toContain(supplied[0]);
  });

  it("re-reads the Auditorium however old the result is, and re-reads no listing it still holds", async () => {
    const fresh = await verifying({ at: SEARCHED_AT });
    const stale = await verifying({ at: SEARCHED_AT + AN_HOUR });
    const twice = await verifying();

    expect((await fresh.verify()).ok).toBe(true);
    expect((await stale.verify()).ok).toBe(true);
    expect(fresh.requested()).toEqual([
      BOOTSTRAP,
      `${SEAT_MAP}${fresh.result.showtime.id}`,
    ]);
    expect(stale.requested()).toEqual([
      BOOTSTRAP,
      `${SEAT_MAP}${stale.result.showtime.id}`,
    ]);

    await twice.verify();
    await twice.verify();

    expect(twice.auditoriumsRead()).toHaveLength(2);
  });

  it("answers taken, with the Auditorium's remaining Seat Groups ranked best-first", async () => {
    const run = await verifying({ answer: withoutTheFirstSeat });
    const verified = await run.verify();
    const alternatives = alternativesIn(verified);
    const scores = alternatives.map((alternative) => alternative.score);

    expect(seatsIn(run.result)).toEqual(["F9", "F8"]);
    expect(verified.ok).toBe(false);
    expect(verified.ok || verified.reason).toBe("taken");
    expect(alternatives.map((alternative) => alternative.key)).toEqual([
      "557985744:F8+F7",
      "557985744:G9+G8",
      "557985744:D9+D8",
      "557985744:C9+C8",
      "557985744:H10+H9",
      "557985744:B9+B8",
      "557985744:F12+F11",
      "557985744:A8+A7",
      "557985744:G12+G11",
      "557985744:D12+D11",
      "557985744:C12+C11",
      "557985744:B12+B11",
    ]);
    expect(alternatives.flatMap(seatsIn)).not.toContain("F9");
    expect(new Set(scores).size).toBe(scores.length);
  });

  it("does not call a Seat Group taken because a Seat beside it came free", async () => {
    const freed = (room: string) => roomWhere(room, { F5: "A" });
    const run = await verifying({ answer: (_, room) => freed(room) });
    const shifted = await verifying({ searchedIn: freed });
    const verified = await run.verify();

    expect(seatsIn(shifted.result)).toEqual(["F8", "F7"]);
    expect(verified.ok && seatsIn(verified.result)).toEqual(["F9", "F8"]);
    expect(verified.ok && verified.result.key).toBe(run.result.key);
    expect(verified.ok && verified.result.removed.unavailable).toBe(
      run.result.removed.unavailable - 1,
    );
  });

  it("answers taken and offers no alternative when the Auditorium refuses the read", async () => {
    const runs = await Promise.all(
      [
        "PerformanceSoldOut",
        "ExpiredPerformance",
        "GeneralAdmissionShowtimeError",
      ].map((reason) => verifying({ answer: () => refusalNamed(reason) })),
    );
    const verified = await Promise.all(runs.map((run) => run.verify()));

    expect(verified.map((one) => one.ok)).toEqual([false, false, false]);
    expect(verified.map((one) => one.ok || one.reason)).toEqual([
      "taken",
      "taken",
      "taken",
    ]);
    expect(verified.flatMap(alternativesIn)).toEqual([]);
  });

  it("answers unreachable and no ticketing URL when the Auditorium cannot be read", async () => {
    const run = await verifying({ script: refusing });
    const verified = await run.verify();

    expect(verified.ok).toBe(false);
    expect(verified.ok || verified.reason).toBe("unreachable");
    expect(alternativesIn(verified)).toEqual([]);
    expect(verified).not.toHaveProperty("ticketing");
    expect(run.auditoriumsRead()).toHaveLength(3);
  });

  it("answers unreachable, and spends no request on an Auditorium, when the listing cannot be read", async () => {
    const run = await verifying({
      store: () => inMemoryStore(),
      script: () => ({ sequences: { [LISTING]: [500, 500, 500] } }),
    });
    const verified = await run.verify();

    expect(verified.ok).toBe(false);
    expect(verified.ok || verified.reason).toBe("unreachable");
    expect(run.auditoriumsRead()).toEqual([]);
  });

  it("answers taken, without asking for an Auditorium, when the listing no longer offers the Showtime", async () => {
    const run = await verifying({
      store: (listed) =>
        holding({
          fetchedAt: SEARCHED_AT,
          catalogue: {
            bookable: [],
            unbookable: listed.bookable.map((showtime) => ({
              showtime,
              reason: "soldOut",
            })),
            unidentified: [],
          },
        }),
    });
    const verified = await run.verify();

    expect(verified.ok).toBe(false);
    expect(verified.ok || verified.reason).toBe("taken");
    expect(alternativesIn(verified)).toEqual([]);
    expect(run.auditoriumsRead()).toEqual([]);
  });

  it("carries on a result the terms a re-verification needs, and none the listing was narrowed by", async () => {
    const run = await verifying({ formats: ["Dolby Cinema"] });

    expect(Object.keys(run.result.terms).toSorted()).toEqual([
      "accessibleSeating",
      "area",
      "date",
      "movie",
      "partySize",
      "profile",
    ]);
    expect(run.result.terms).toEqual({
      movie: WIDE_RELEASE,
      date: TODAY,
      area: AREA,
      partySize: 2,
      accessibleSeating: false,
      profile: undefined,
    });
    expectTypeOf<
      Parameters<ReturnType<typeof openVerification>>
    >().toEqualTypeOf<[SeatGroupResult]>();
  });

  it("re-reads the Auditorium when the listing has since dropped the Format the Query named", async () => {
    const run = await verifying({
      formats: ["Dolby Cinema"],
      store: (listed) =>
        holding({
          fetchedAt: SEARCHED_AT,
          catalogue: {
            ...listed,
            bookable: listed.bookable.map((showtime) => ({
              ...showtime,
              presentation: { ...showtime.presentation, formats: [] },
            })),
          },
        }),
    });
    const verified = await run.verify();

    expect(verified.ok).toBe(true);
    expect(run.auditoriumsRead()).toHaveLength(1);
  });

  it("ranks the alternatives against the Seat Profile the Query carried", async () => {
    const reference = await verifying({ answer: withoutTheFirstSeat });
    const front = await verifying({
      answer: withoutTheFirstSeat,
      profile: { ...REFERENCE, targetDepth: 0 },
    });
    const middle = alternativesIn(await reference.verify());
    const nearest = alternativesIn(await front.verify());

    expect(seatsIn(reference.result)).toEqual(["F9", "F8"]);
    expect(seatsIn(front.result)).toEqual(["A8", "A7"]);
    expect(middle[0]?.reasons.rowFromFront).toBe(6);
    expect(nearest[0]?.reasons.rowFromFront).toBe(1);
  });

  it("offers only Seat Groups carrying an accessible Seat to a Query that asked for one", async () => {
    const run = await verifying({
      accessibleSeating: true,
      room: ACCESSIBLE_ROOM,
      answer: withoutTheFirstSeat,
    });
    const alternatives = alternativesIn(await run.verify());

    expect(seatsIn(run.result)).toEqual(["D4", "D3"]);
    expect(alternatives.map(seatsIn)).toEqual([
      ["D6", "D5"],
      ["D2", "D1"],
      ["D8", "D7"],
    ]);
    expect(
      alternatives.filter((alternative) =>
        alternative.seats.every((seat) => seat.designation === "standard"),
      ),
    ).toEqual([]);
  });

  it("answers with a fresh reading of the Seat Group rather than the one it was handed", async () => {
    const run = await verifying();
    const verified = await run.verify();

    expect(run.result.fetchedAt).toBe(SEARCHED_AT);
    expect(verified.ok && verified.result.fetchedAt).toBe(VERIFIED_AT);
    expect(
      verified.ok &&
        verified.result.seats.map((seat) => seat.provenance.fetchedAt),
    ).toEqual([VERIFIED_AT, VERIFIED_AT]);
    expect(verified.ok && verified.result.key).toBe(run.result.key);
    expect(verified.ok && verified.result.score).toBe(run.result.score);
  });

  it("carries the consoles the Seat Group crosses into the reading it answers with", async () => {
    const run = await verifying({ partySize: 3, room: POD_ROOM });
    const verified = await run.verify();

    expect(seatsIn(run.result)).toEqual(["E7", "E6", "E5"]);
    expect(run.result.podDividers).toBe(1);
    expect(verified.ok && verified.result.podDividers).toBe(1);
    expect(verified.ok && verified.result.score).toBe(run.result.score);
  });

  it("offers a search result nothing that can be handed off", () => {
    expectTypeOf<SeatGroupResult>().not.toHaveProperty("ticketing");
    expectTypeOf<SeatGroupResult["showtime"]>().not.toHaveProperty("ticketing");
    expectTypeOf<SeatGroupResult["showtime"]>().not.toExtend<Showtime>();
    expectTypeOf<Extract<Verified, { ok: false }>>().not.toHaveProperty(
      "ticketing",
    );
    expectTypeOf<
      Extract<Verified, { ok: true }>["ticketing"]
    >().toEqualTypeOf<TicketingUrl>();
  });
});
