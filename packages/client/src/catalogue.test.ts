import { type Catalogue, type Reading, openSource } from "@seatscout/core";
import {
  type UpstreamScript,
  fakeUpstream,
  recordedCaptures,
  routeOf,
} from "@seatscout/core/testing";
import { describe, expect, expectTypeOf, it } from "vitest";
import { type CatalogueTerms, openCatalogue } from "./catalogue.js";
import {
  type CachedCatalogue,
  type KeyValueStore,
  inMemoryStore,
} from "./store.js";

const AREA = "75006";
const TODAY = "2026-08-28";
const YESTERDAY = "2026-08-27";
const WIDE_RELEASE = "245569";
const LISTINGS = "/napi/theaterShowtimeGroupings";
const SEAT_MAP = "/napi/seatMap/";
const TERMS: CatalogueTerms = { movie: WIDE_RELEASE, date: TODAY, area: AREA };
const TWO_HOURS = 7_200_000;
const EMPTY = { bookable: [], unbookable: [], unidentified: [] };
const EARLIER_KEY = 'seatscout.catalogue.["245569","2026-08-28","75006"]';
const PAST_THE_FIELD_PROBE = {
  id: 561682849,
  startsAt: "2026-08-28T19:20:00-05:00",
  presentation: {
    movie: WIDE_RELEASE,
    theater: { id: "a-theater", name: "Cinemark Dallas XD and IMAX" },
    amenities: [],
  },
  ticketing: "https://tickets.invalid/jump",
};
const FETCHED_AT = 1000;

type Written = Parameters<KeyValueStore["write"]>[1];

interface Options {
  readonly cacheForMs?: number;
  readonly script?: Omit<UpstreamScript, "seed">;
  readonly store?: KeyValueStore;
}

const opened = (options: Options = {}) => {
  const clock = { at: FETCHED_AT };
  const upstream = fakeUpstream({ seed: 4, ...options.script });
  const source = openSource({
    fetch: upstream,
    now: () => clock.at,
    wait: () => Promise.resolve(),
    random: () => 0.5,
  });
  return {
    clock,
    source,
    resolve: openCatalogue({
      source,
      store: options.store ?? inMemoryStore(),
      now: () => clock.at,
      cacheForMs: options.cacheForMs,
    }),
    listings: () =>
      upstream.requests.filter((request) => request.path.startsWith(LISTINGS))
        .length,
  };
};

const watching = () => {
  const held = inMemoryStore();
  const written: { key: string; value: CachedCatalogue }[] = [];
  return {
    written,
    store: {
      read: (key: string) => held.read(key),
      write: (key: string, value: CachedCatalogue) => {
        written.push({ key, value });
        return held.write(key, value);
      },
    },
  };
};

const answering = (value: unknown): KeyValueStore => ({
  read: async () => value,
  write: async () => undefined,
});

const holdingAt = (key: string, value: unknown): KeyValueStore => ({
  read: async (asked) => (asked === key ? value : undefined),
  write: async () => undefined,
});

const fieldsIn = (value: unknown, at = ""): readonly string[] =>
  Array.isArray(value)
    ? value.flatMap((item) => fieldsIn(item, at))
    : value instanceof Object
      ? Object.entries(value).flatMap(([field, held]) => [
          `${at}${field}`,
          ...fieldsIn(held, `${at}${field}.`),
        ])
      : [];

const payloadOf = <Found>(reading: Reading<Found>): Found => {
  if (!reading.ok) throw new Error(`the catalogue answered ${reading.reason}`);
  return reading.payload;
};

const counted = (reading: Reading<Catalogue>) => {
  const catalogue = payloadOf(reading);
  return {
    bookable: catalogue.bookable.length,
    unbookable: catalogue.unbookable.length,
    unidentified: catalogue.unidentified.length,
  };
};

const asUnidentified = (catalogue: Catalogue): CachedCatalogue => ({
  fetchedAt: FETCHED_AT,
  catalogue: {
    bookable: [],
    unbookable: [],
    unidentified: catalogue.bookable.map((showtime) => ({
      startsAt: showtime.startsAt,
      presentation: showtime.presentation,
      ticketing: showtime.ticketing,
    })),
  },
});

const seatMapShowtime = () => {
  const captured = recordedCaptures().find(
    (capture) =>
      capture.status === 200 &&
      routeOf(capture.request.path).startsWith(SEAT_MAP),
  );
  if (captured === undefined) throw new Error("no seat map was captured");
  return routeOf(captured.request.path).slice(SEAT_MAP.length);
};

describe("the catalogue phase", () => {
  it("resolves catalogue terms to the candidate Showtimes the fixtures hold", async () => {
    const { resolve } = opened();

    expect(counted(await resolve(TERMS))).toEqual({
      bookable: 172,
      unbookable: 4,
      unidentified: 0,
    });
    expect(
      counted(await resolve({ ...TERMS, formats: ["IMAX", "ScreenX"] })),
    ).toEqual({ bookable: 3, unbookable: 0, unidentified: 0 });
    expect(
      counted(
        await resolve({
          ...TERMS,
          from: Date.parse("2026-08-28T19:00:00-05:00"),
          until: Date.parse("2026-08-28T22:00:00-05:00"),
        }),
      ),
    ).toEqual({ bookable: 46, unbookable: 0, unidentified: 0 });
  });

  it("answers a second read inside the TTL from the cache, with the age it actually has", async () => {
    const { resolve, clock, listings } = opened({ cacheForMs: TWO_HOURS });
    const first = await resolve(TERMS);
    clock.at += TWO_HOURS - 1;
    const second = await resolve(TERMS);

    expect(listings()).toBe(1);
    expect(second).toEqual({
      ok: true,
      payload: payloadOf(first),
      fetchedAt: FETCHED_AT,
      attempts: 0,
    });
  });

  it("serves the cache up to the last millisecond of the TTL and reads the Source at it", async () => {
    const inside = opened({ cacheForMs: 60_000 });
    await inside.resolve(TERMS);
    inside.clock.at += 59_999;
    await inside.resolve(TERMS);
    const past = opened({ cacheForMs: 60_000 });
    await past.resolve(TERMS);
    past.clock.at += 60_000;
    await past.resolve(TERMS);

    expect([inside.listings(), past.listings()]).toEqual([1, 2]);
  });

  it("caches for two hours when it is not told otherwise", async () => {
    const inside = opened();
    await inside.resolve(TERMS);
    inside.clock.at += TWO_HOURS - 1;
    await inside.resolve(TERMS);
    const past = opened();
    await past.resolve(TERMS);
    past.clock.at += TWO_HOURS;
    await past.resolve(TERMS);

    expect([inside.listings(), past.listings()]).toEqual([1, 2]);
  });

  it("reads the Source every time when it is told to cache for nothing", async () => {
    const { resolve, listings } = opened({ cacheForMs: 0 });
    await resolve(TERMS);
    await resolve(TERMS);

    expect(listings()).toBe(2);
  });

  it("narrows a cached catalogue rather than reading the Source again", async () => {
    const { resolve, listings } = opened();
    const whole = counted(await resolve(TERMS));
    const narrowed = counted(await resolve({ ...TERMS, formats: ["IMAX"] }));

    expect(listings()).toBe(1);
    expect(whole).toEqual({ bookable: 172, unbookable: 4, unidentified: 0 });
    expect(narrowed).toEqual({ bookable: 1, unbookable: 0, unidentified: 0 });
  });

  it("answers a Query with the Showtimes the Source could not identify, narrowed like the rest", async () => {
    const listed = payloadOf(await opened().resolve(TERMS));
    const { resolve, listings } = opened({
      store: answering(asUnidentified(listed)),
    });

    expect(counted(await resolve(TERMS))).toEqual({
      bookable: 0,
      unbookable: 0,
      unidentified: 172,
    });
    expect(counted(await resolve({ ...TERMS, formats: ["IMAX"] }))).toEqual({
      bookable: 0,
      unbookable: 0,
      unidentified: 1,
    });
    expect(listings()).toBe(0);
  });

  it("gives a Movie, a date and an area their own cache entry each", async () => {
    const { resolve, listings } = opened();
    await resolve(TERMS);
    await resolve({ ...TERMS, date: YESTERDAY });
    await resolve({ ...TERMS, area: "75201" });
    await resolve({ ...TERMS, movie: "243819", date: TODAY });

    expect(listings()).toBe(4);
  });

  it("names a cache entry after the terms that identify it and the shape it stores", async () => {
    const watched = watching();
    await opened({ store: watched.store }).resolve({
      ...TERMS,
      formats: ["IMAX"],
    });

    expect(watched.written.map((entry) => entry.key)).toEqual([
      'seatscout.catalogue.v1.["245569","2026-08-28","75006"]',
    ]);
    expect(
      [...new Set(fieldsIn(watched.written[0]?.value))].toSorted(),
    ).toEqual([
      "catalogue",
      "catalogue.bookable",
      "catalogue.bookable.id",
      "catalogue.bookable.presentation",
      "catalogue.bookable.presentation.amenities",
      "catalogue.bookable.presentation.formats",
      "catalogue.bookable.presentation.movie",
      "catalogue.bookable.presentation.theater",
      "catalogue.bookable.presentation.theater.chain",
      "catalogue.bookable.presentation.theater.id",
      "catalogue.bookable.presentation.theater.name",
      "catalogue.bookable.startsAt",
      "catalogue.bookable.ticketing",
      "catalogue.unbookable",
      "catalogue.unbookable.reason",
      "catalogue.unbookable.showtime",
      "catalogue.unbookable.showtime.id",
      "catalogue.unbookable.showtime.presentation",
      "catalogue.unbookable.showtime.presentation.amenities",
      "catalogue.unbookable.showtime.presentation.formats",
      "catalogue.unbookable.showtime.presentation.movie",
      "catalogue.unbookable.showtime.presentation.theater",
      "catalogue.unbookable.showtime.presentation.theater.chain",
      "catalogue.unbookable.showtime.presentation.theater.id",
      "catalogue.unbookable.showtime.presentation.theater.name",
      "catalogue.unbookable.showtime.startsAt",
      "catalogue.unbookable.showtime.ticketing",
      "catalogue.unidentified",
      "fetchedAt",
    ]);
  });

  it("reads the Source again rather than trusting a cache entry it cannot read", async () => {
    const unreadable: readonly unknown[] = [
      null,
      "a catalogue, honestly",
      {},
      {
        fetchedAt: "recently",
        catalogue: { bookable: [], unbookable: [], unidentified: [] },
      },
      {
        fetchedAt: `${FETCHED_AT}`,
        catalogue: { bookable: [], unbookable: [], unidentified: [] },
      },
      { fetchedAt: FETCHED_AT },
      { fetchedAt: FETCHED_AT, catalogue: null },
      {
        fetchedAt: FETCHED_AT,
        catalogue: { bookable: [], unidentified: [] },
      },
      {
        fetchedAt: FETCHED_AT,
        catalogue: { unbookable: [], unidentified: [] },
      },
      { fetchedAt: FETCHED_AT, catalogue: { bookable: [], unbookable: [] } },
      {
        fetchedAt: FETCHED_AT,
        catalogue: { bookable: "none", unbookable: [], unidentified: [] },
      },
      {
        fetchedAt: FETCHED_AT,
        catalogue: { bookable: [], unbookable: "none", unidentified: [] },
      },
      {
        fetchedAt: FETCHED_AT,
        catalogue: { bookable: [], unbookable: [], unidentified: "none" },
      },
    ];
    const reread: number[] = [];
    for (const value of unreadable) {
      const { resolve, listings } = opened({ store: answering(value) });
      await resolve(TERMS);
      reread.push(listings());
    }

    expect(reread).toEqual(unreadable.map(() => 1));
  });

  it("never reads an entry written under an earlier build's key, however far its Showtimes have drifted", async () => {
    const { resolve, listings } = opened({
      store: holdingAt(EARLIER_KEY, {
        fetchedAt: FETCHED_AT,
        catalogue: { ...EMPTY, bookable: [PAST_THE_FIELD_PROBE] },
      }),
    });

    expect(counted(await resolve({ ...TERMS, formats: ["IMAX"] }))).toEqual({
      bookable: 1,
      unbookable: 0,
      unidentified: 0,
    });
    expect(listings()).toBe(1);
  });

  it("answers an area the Source listed nothing in from the cache like any other", async () => {
    const { resolve, listings } = opened({
      store: answering({ fetchedAt: FETCHED_AT, catalogue: EMPTY }),
    });

    expect(counted(await resolve(TERMS))).toEqual({
      bookable: 0,
      unbookable: 0,
      unidentified: 0,
    });
    expect(listings()).toBe(0);
  });

  it("does not remember a Source it could not read", async () => {
    const watched = watching();
    const { resolve } = opened({
      store: watched.store,
      script: {
        sequences: {
          [`${LISTINGS}/${WIDE_RELEASE}/${TODAY}`]: [500, 500, 500],
        },
      },
    });
    const reading = await resolve(TERMS);

    expect(reading).toEqual({
      ok: false,
      reason: "unreachable",
      fetchedAt: FETCHED_AT,
      attempts: 3,
    });
    expect(watched.written).toEqual([]);
  });

  it("carries the Showtimes a cached catalogue offers that have already begun", async () => {
    const { resolve } = opened();
    const yesterday = payloadOf(await resolve({ ...TERMS, date: YESTERDAY }));

    expect(yesterday.bookable).toEqual([]);
    expect(
      yesterday.unbookable.filter((entry) => entry.reason === "started").length,
    ).toBe(77);
  });

  it("hands the store the whole listing and nothing besides, then narrows on the way out", async () => {
    const watched = watching();
    const { resolve } = opened({ store: watched.store });
    const reading = await resolve({ ...TERMS, formats: ["IMAX"] });
    const stored = watched.written[0]?.value;

    expect(watched.written).toHaveLength(1);
    expect(Object.keys(stored ?? {}).toSorted()).toEqual([
      "catalogue",
      "fetchedAt",
    ]);
    expect(stored?.fetchedAt).toBe(FETCHED_AT);
    expect({
      bookable: stored?.catalogue.bookable.length,
      unbookable: stored?.catalogue.unbookable.length,
      unidentified: stored?.catalogue.unidentified.length,
    }).toEqual({ bookable: 172, unbookable: 4, unidentified: 0 });
    expect(counted(reading)).toEqual({
      bookable: 1,
      unbookable: 0,
      unidentified: 0,
    });
  });

  it("will not accept Seats where the store takes a catalogue", async () => {
    const { source } = opened();
    const seats = payloadOf(await source.seatsFor(seatMapShowtime()));

    expect(seats.length).toBeGreaterThan(0);
    expect(seats.some((seat) => seat.bookable)).toBe(true);
    expectTypeOf<string>().not.toExtend<Written>();
    expectTypeOf({
      fetchedAt: FETCHED_AT,
      catalogue: { bookable: seats, unbookable: [], unidentified: [] },
    }).not.toExtend<Written>();
  });
});
