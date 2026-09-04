import type { Catalogue } from "@seatscout/core";
import { describe, expect, it } from "vitest";
import {
  FETCHED_AT,
  TERMS,
  TODAY,
  YESTERDAY,
  answering,
  counted,
  opened,
  payloadOf,
} from "./catalogue.fixtures.js";
import type { CachedCatalogue } from "./store.js";

const TWO_HOURS = 7_200_000;

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
});
