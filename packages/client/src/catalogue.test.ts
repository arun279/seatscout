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

const BOOTSTRAP = "/napi/preferences/themes";
const AREA = "75006";
const TODAY = "2026-08-28";
const YESTERDAY = "2026-08-27";
const WIDE_RELEASE = "245569";
const LISTINGS = "/napi/theaterShowtimeGroupings";
const TERMS: CatalogueTerms = { movie: WIDE_RELEASE, date: TODAY, area: AREA };
const TWO_HOURS = 7_200_000;
const FETCHED_AT = 1000;

interface Options {
  readonly cacheForMs?: number;
  readonly script?: Omit<UpstreamScript, "seed">;
  readonly store?: KeyValueStore;
}

const opened = (options: Options = {}) => {
  const clock = { at: FETCHED_AT };
  const upstream = fakeUpstream({
    seed: 4,
    ...options.script,
    routes: {
      [BOOTSTRAP]: { status: 200, body: "{}" },
      ...options.script?.routes,
    },
  });
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

const payloadOf = <Found>(reading: Reading<Found>): Found => {
  if (!reading.ok) throw new Error(`the catalogue answered ${reading.reason}`);
  return reading.payload;
};

const counted = (reading: Reading<Catalogue>) => ({
  bookable: payloadOf(reading).bookable.length,
  unbookable: payloadOf(reading).unbookable.length,
});

const keysIn = (value: unknown): readonly string[] => {
  if (Array.isArray(value)) return value.flatMap(keysIn);
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, nested]) => [
    key,
    ...keysIn(nested),
  ]);
};

describe("the catalogue phase", () => {
  it("resolves catalogue terms to the candidate Showtimes the fixtures hold", async () => {
    const { resolve } = opened();

    expect(counted(await resolve(TERMS))).toEqual({
      bookable: 172,
      unbookable: 4,
    });
    expect(
      counted(await resolve({ ...TERMS, formats: ["IMAX", "ScreenX"] })),
    ).toEqual({ bookable: 3, unbookable: 0 });
    expect(
      counted(
        await resolve({
          ...TERMS,
          from: Date.parse("2026-08-28T19:00:00-05:00"),
          until: Date.parse("2026-08-28T22:00:00-05:00"),
        }),
      ),
    ).toEqual({ bookable: 46, unbookable: 0 });
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
    expect(whole).toEqual({ bookable: 172, unbookable: 4 });
    expect(narrowed).toEqual({ bookable: 1, unbookable: 0 });
  });

  it("gives a Movie, a date and an area their own cache entry each", async () => {
    const { resolve, listings } = opened();
    await resolve(TERMS);
    await resolve({ ...TERMS, date: YESTERDAY });
    await resolve({ ...TERMS, area: "75201" });
    await resolve({ ...TERMS, movie: "243819", date: TODAY });

    expect(listings()).toBe(4);
  });

  it("names a cache entry after the terms that identify it", async () => {
    const watched = watching();
    await opened({ store: watched.store }).resolve({
      ...TERMS,
      formats: ["IMAX"],
    });

    expect(watched.written.map((entry) => entry.key)).toEqual([
      'seatscout.catalogue.["245569","2026-08-28","75006"]',
    ]);
  });

  it("reads the Source again rather than trusting a cache entry it cannot read", async () => {
    const unreadable: readonly unknown[] = [
      null,
      "a catalogue, honestly",
      {},
      { fetchedAt: "recently", catalogue: { bookable: [], unbookable: [] } },
      { fetchedAt: FETCHED_AT },
      { fetchedAt: FETCHED_AT, catalogue: null },
      { fetchedAt: FETCHED_AT, catalogue: { bookable: [] } },
      { fetchedAt: FETCHED_AT, catalogue: { unbookable: [] } },
      {
        fetchedAt: FETCHED_AT,
        catalogue: { bookable: "none", unbookable: [] },
      },
      {
        fetchedAt: FETCHED_AT,
        catalogue: { bookable: [], unbookable: "none" },
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

  it("is handed the catalogue it read and never a Seat", async () => {
    const watched = watching();
    const { resolve, source } = opened({ store: watched.store });
    const captured = recordedCaptures().find(
      (capture) =>
        capture.status === 200 &&
        routeOf(capture.request.path).includes("/seatMap/"),
    );
    const reading = await resolve(TERMS);
    const seats = payloadOf(
      await source.seatsFor(
        `${routeOf(captured?.request.path ?? "")
          .split("/")
          .at(-1)}`,
      ),
    );
    const seatWords = new Set(keysIn(seats));

    expectTypeOf<KeyValueStore["write"]>()
      .parameter(1)
      .toEqualTypeOf<CachedCatalogue>();
    expectTypeOf<string>().not.toExtend<CachedCatalogue>();
    expectTypeOf(seats).not.toExtend<
      CachedCatalogue["catalogue"]["bookable"]
    >();

    expect(seats.length).toBeGreaterThan(0);
    expect(seats.some((seat) => seat.bookable)).toBe(true);
    expect(watched.written).toEqual([
      {
        key: expect.any(String),
        value: { fetchedAt: FETCHED_AT, catalogue: payloadOf(reading) },
      },
    ]);
    expect(
      [...new Set(keysIn(watched.written.map((entry) => entry.value)))]
        .filter((word) => seatWords.has(word))
        .toSorted(),
    ).toEqual(["bookable", "fetchedAt", "id"]);
  });
});
