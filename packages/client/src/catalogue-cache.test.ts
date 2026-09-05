import { recordedCaptures, routeOf } from "@seatscout/core/testing";
import { describe, expect, expectTypeOf, it } from "vitest";
import {
  FETCHED_AT,
  LISTINGS,
  TERMS,
  TODAY,
  WIDE_RELEASE,
  YESTERDAY,
  answering,
  counted,
  opened,
  payloadOf,
} from "./catalogue.fixtures.js";
import { type KeyValueStore, inMemoryStore } from "./store.js";

const SEAT_MAP = "/napi/seatMap/";
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

type Written = Parameters<KeyValueStore["write"]>[1];

const watching = () => {
  const held = inMemoryStore();
  const written: { key: string; value: Written }[] = [];
  return {
    written,
    store: {
      read: (key: string) => held.read(key),
      write: (key: string, value: Written) => {
        written.push({ key, value });
        return held.write(key, value);
      },
    },
  };
};

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

const seatMapShowtime = () => {
  const captured = recordedCaptures().find(
    (capture) =>
      capture.status === 200 &&
      routeOf(capture.request.path).startsWith(SEAT_MAP),
  );
  if (captured === undefined) throw new Error("no seat map was captured");
  return routeOf(captured.request.path).slice(SEAT_MAP.length);
};

describe("what the catalogue phase caches", () => {
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
    if (stored === undefined || !("catalogue" in stored))
      throw new Error("the listing was not stored as a catalogue");

    expect(watched.written).toHaveLength(1);
    expect(Object.keys(stored).toSorted()).toEqual(["catalogue", "fetchedAt"]);
    expect(stored.fetchedAt).toBe(FETCHED_AT);
    expect({
      bookable: stored.catalogue.bookable.length,
      unbookable: stored.catalogue.unbookable.length,
      unidentified: stored.catalogue.unidentified.length,
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
