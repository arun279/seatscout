import {
  type Catalogue,
  REFERENCE,
  type Reading,
  type SeatProfile,
  type Showtime,
  type UnbookableReason,
  narrowed,
  openSource,
} from "@seatscout/core";
import {
  type UpstreamScript,
  fakeUpstream,
  recordedCaptures,
  routeOf,
} from "@seatscout/core/testing";
import { describe, expect, it } from "vitest";
import {
  type Coverage,
  type SearchTerms,
  type Snapshot,
  openSearch,
} from "./search.js";
import { type CachedCatalogue, inMemoryStore } from "./store.js";

const BOOTSTRAP = "/napi/preferences/themes";
const SEAT_MAP = "/napi/seatMap/";
const LISTING = "/napi/theaterShowtimeGroupings/245569/2026-08-28";
const AREA = "75006";
const TODAY = "2026-08-28";
const WIDE_RELEASE = "245569";
const AT = 1000;
const STONEBRIAR = "AMC Stonebriar 24";
const INWOOD = "Landmark Inwood Theatre";
const VILLAGE = "AMC Village on the Parkway 9";
const WIDTH = 24;
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

const refusalNamed = (reason: string) => {
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

const theaterIn = (catalogue: Catalogue, name: string) => {
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

const routesTo = (
  showtimes: readonly Showtime[],
  answer: { status: number; body: string },
): Routes =>
  Object.fromEntries(
    showtimes.map((showtime) => [`${SEAT_MAP}${showtime.id}`, answer]),
  );

const listing = async () => {
  const source = openSource({
    fetch: fakeUpstream({
      seed: 1,
      routes: { [BOOTSTRAP]: { status: 200, body: "{}" } },
    }),
    now: () => AT,
    wait: () => Promise.resolve(),
    random: () => 0.5,
  });
  return payloadOf(await source.showtimesFor(WIDE_RELEASE, TODAY, AREA));
};

const searching = async (options: Options = {}) => {
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
      [BOOTSTRAP]: { status: 200, body: "{}" },
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

const idsIn = (snapshot: Snapshot) =>
  snapshot.results.map((result) => result.showtime.id);

const arrivalIn = (snapshots: readonly Snapshot[]) => {
  const order: number[] = [];
  for (const snapshot of snapshots)
    for (const id of idsIn(snapshot)) if (!order.includes(id)) order.push(id);
  return order;
};

const namedIn = (coverage: Coverage) => [
  ...coverage.soldOut,
  ...coverage.noSeatMap,
  ...coverage.started,
  ...coverage.salesOff,
  ...coverage.unidentified,
];

const accountedIn = (coverage: Coverage) =>
  coverage.checked + namedIn(coverage).length + coverage.failed.length;

const withoutIdentity = (showtime: Showtime) => ({
  startsAt: showtime.startsAt,
  presentation: showtime.presentation,
  ticketing: showtime.ticketing,
});

const stoppedSelling = (
  showtime: Showtime,
): { readonly showtime: Showtime; readonly reason: UnbookableReason } => ({
  showtime,
  reason: "salesOff",
});

describe("a search", () => {
  it("answers the best Seat Group at every Showtime it could check, ranked best-first", async () => {
    const run = await searching({ at: [STONEBRIAR] });
    const settled = await run.search.done;

    expect(settled.phase).toBe("settled");
    expect(settled.coverage).toEqual({
      candidates: 5,
      checked: 4,
      soldOut: [expect.objectContaining({ id: 561549583 })],
      noSeatMap: [],
      started: [],
      salesOff: [],
      unidentified: [],
      failed: [],
    });
    expect(idsIn(settled)).toEqual([
      558117351, 558782900, 558782901, 557985744,
    ]);
    expect(run.snapshots.map((snapshot) => snapshot.phase)).toEqual([
      "searching",
      "searching",
      "searching",
      "searching",
      "searching",
      "settled",
    ]);
  });

  it("delivers a ranking rather than an arrival order, under a seed that reorders", async () => {
    const run = await searching({ at: [STONEBRIAR] });
    const settled = await run.search.done;

    expect(run.requested()).toEqual([
      558117351, 558782900, 558782901, 557985744,
    ]);
    expect(arrivalIn(run.snapshots)).toEqual([
      558782901, 558782900, 558117351, 557985744,
    ]);
    expect(idsIn(settled)).not.toEqual(arrivalIn(run.snapshots));
    for (const snapshot of run.snapshots)
      expect(snapshot.results.map((result) => result.score)).toEqual(
        snapshot.results
          .map((result) => result.score)
          .toSorted((a, b) => b - a),
      );
  });

  it("never changes a score it has assigned and never drops a result", async () => {
    const run = await searching({ at: [INWOOD, STONEBRIAR] });
    await run.search.done;
    const scores = new Map<string, Set<number>>();
    const held = new Set<string>();

    for (const snapshot of run.snapshots) {
      const keys = new Set(snapshot.results.map((result) => result.key));
      expect([...held].filter((key) => !keys.has(key))).toEqual([]);
      for (const result of snapshot.results) {
        held.add(result.key);
        scores.set(
          result.key,
          (scores.get(result.key) ?? new Set()).add(result.score),
        );
      }
    }

    expect(held.size).toBe(4);
    expect([...scores.values()].map((seen) => seen.size)).toEqual([1, 1, 1, 1]);
  });

  it("never lets a Coverage outcome go backwards", async () => {
    const run = await searching({});
    await run.search.done;
    const counts = run.snapshots.map((snapshot) => [
      snapshot.coverage.checked,
      snapshot.coverage.soldOut.length,
      snapshot.coverage.noSeatMap.length,
      snapshot.coverage.started.length,
      snapshot.coverage.salesOff.length,
      snapshot.coverage.unidentified.length,
      snapshot.coverage.failed.length,
    ]);

    expect(counts.length).toBe(174);
    expect(
      counts.filter((row, at) =>
        row.some((count, outcome) => count < (counts[at - 1]?.[outcome] ?? 0)),
      ),
    ).toEqual([]);
  });

  it("closes the Coverage ledger in every snapshot, not only the last", async () => {
    const run = await searching({});
    const settled = await run.search.done;

    const left = run.snapshots.map(
      (snapshot) =>
        snapshot.coverage.candidates - accountedIn(snapshot.coverage),
    );

    expect(run.snapshots).toHaveLength(174);
    expect(left.filter((over) => over < 0)).toEqual([]);
    expect(left.filter((now, at) => now > (left[at - 1] ?? now))).toEqual([]);
    expect(left[0]).toBe(172);
    expect(left.at(-1)).toBe(0);
    expect(settled.coverage.candidates).toBe(176);
  });

  it("does not change a snapshot a caller is still holding", async () => {
    const run = await searching({
      at: [STONEBRIAR],
      answers: (bookable) => ({
        ...routesTo(
          bookable.slice(0, 1),
          refusalNamed("GeneralAdmissionShowtimeError"),
        ),
        ...routesTo(bookable.slice(1, 2), refusalNamed("PerformanceSoldOut")),
      }),
    });
    await run.search.done;

    expect(run.snapshots.map((snapshot) => JSON.stringify(snapshot))).toEqual(
      run.frozen,
    );
    expect(new Set(run.frozen).size).toBe(run.frozen.length);
  });

  it("spends no request on a Showtime the listing already reported unbookable", async () => {
    const run = await searching({ at: [INWOOD, STONEBRIAR] });
    const settled = await run.search.done;

    expect(settled.coverage.candidates).toBe(8);
    expect(settled.coverage.noSeatMap).toHaveLength(3);
    expect(settled.coverage.soldOut).toHaveLength(1);
    expect(run.requested()).toHaveLength(4);
    expect(run.requested()).not.toContain(561549583);
  });

  it("names a Showtime that has begun as started rather than as failed", async () => {
    const run = await searching({
      at: [STONEBRIAR],
      answers: (bookable) =>
        routesTo(bookable.slice(0, 1), refusalNamed("ExpiredPerformance")),
    });
    const settled = await run.search.done;

    expect(
      settled.coverage.started.map((showtime) => showtime.startsAt),
    ).toEqual([run.candidates.bookable[0]?.startsAt]);
    expect(settled.coverage.failed).toEqual([]);
    expect(settled.coverage.checked).toBe(3);
  });

  it("names a general admission Showtime and a sold out one from the seat map itself", async () => {
    const run = await searching({
      at: [STONEBRIAR],
      answers: (bookable) => ({
        ...routesTo(
          bookable.slice(0, 1),
          refusalNamed("GeneralAdmissionShowtimeError"),
        ),
        ...routesTo(bookable.slice(1, 2), refusalNamed("PerformanceSoldOut")),
      }),
    });
    const settled = await run.search.done;

    expect(settled.coverage.noSeatMap).toHaveLength(1);
    expect(settled.coverage.soldOut).toHaveLength(2);
    expect(settled.coverage.failed).toEqual([]);
    expect(settled.coverage.checked).toBe(2);
    expect(accountedIn(settled.coverage)).toBe(5);
    expect(new Set(namedIn(settled.coverage)).size).toBe(3);
  });

  it("carries the Showtimes the listing could not identify and spends no request on them", async () => {
    const run = await searching({
      at: [INWOOD, STONEBRIAR],
      cached: (catalogue) => ({
        fetchedAt: AT,
        catalogue: {
          bookable: catalogue.bookable.slice(1),
          unbookable: catalogue.unbookable,
          unidentified: catalogue.bookable.slice(0, 1).map(withoutIdentity),
        },
      }),
    });
    const settled = await run.search.done;

    expect(settled.coverage.candidates).toBe(8);
    expect(settled.coverage.unidentified).toHaveLength(1);
    expect(settled.coverage.failed).toEqual([]);
    expect(run.requested()).toHaveLength(3);
    expect(accountedIn(settled.coverage)).toBe(8);
  });

  it("names a Theater that has stopped selling and offers it neither a request nor a retry", async () => {
    const run = await searching({
      at: [INWOOD, STONEBRIAR],
      cached: (catalogue) => ({
        fetchedAt: AT,
        catalogue: {
          bookable: catalogue.bookable.slice(1),
          unbookable: [
            ...catalogue.unbookable,
            ...catalogue.bookable.slice(0, 1).map(stoppedSelling),
          ],
          unidentified: catalogue.unidentified,
        },
      }),
    });
    const settled = await run.search.done;
    const stopped = run.candidates.bookable[0];

    expect(settled.coverage.candidates).toBe(8);
    expect(settled.coverage.salesOff).toEqual([stopped]);
    expect(settled.coverage.failed).toEqual([]);
    expect(run.requested()).toHaveLength(3);
    expect(run.requested()).not.toContain(stopped?.id);
    expect(accountedIn(settled.coverage)).toBe(8);
  });

  it("closes the ledger with every outcome in it at once", async () => {
    const run = await searching({
      at: [INWOOD, STONEBRIAR, VILLAGE],
      cached: (catalogue) => ({
        fetchedAt: AT,
        catalogue: {
          bookable: catalogue.bookable.slice(2),
          unbookable: [
            ...catalogue.unbookable,
            ...catalogue.bookable.slice(1, 2).map(stoppedSelling),
          ],
          unidentified: catalogue.bookable.slice(0, 1).map(withoutIdentity),
        },
      }),
      answers: (bookable) => ({
        ...routesTo(bookable.slice(2, 3), refusalNamed("ExpiredPerformance")),
        ...routesTo(bookable.slice(3, 4), { status: 500, body: "" }),
      }),
    });
    const settled = await run.search.done;

    expect({
      candidates: settled.coverage.candidates,
      checked: settled.coverage.checked,
      soldOut: settled.coverage.soldOut.length,
      noSeatMap: settled.coverage.noSeatMap.length,
      started: settled.coverage.started.length,
      salesOff: settled.coverage.salesOff.length,
      unidentified: settled.coverage.unidentified.length,
      failed: settled.coverage.failed.length,
    }).toEqual({
      candidates: 12,
      checked: 4,
      soldOut: 1,
      noSeatMap: 3,
      started: 1,
      salesOff: 1,
      unidentified: 1,
      failed: 1,
    });
    expect(accountedIn(settled.coverage)).toBe(12);
    expect(settled.results).toHaveLength(4);
    expect(
      run.snapshots.filter(
        (snapshot) =>
          accountedIn(snapshot.coverage) > snapshot.coverage.candidates,
      ),
    ).toEqual([]);
  });

  it("lists the Showtimes it could not reach, and reaches them once the fault is gone", async () => {
    const listed = await listing();
    const stonebriar = narrowed(listed, {
      theaters: [theaterIn(listed, STONEBRIAR)],
    }).bookable;
    const refused = stonebriar.slice(0, 2).map((showtime) => showtime.id);
    const run = await searching({
      at: [STONEBRIAR],
      script: {
        sequences: Object.fromEntries(
          refused.map((id) => [`${SEAT_MAP}${id}`, [500, 500, 500]]),
        ),
      },
    });
    const settled = await run.search.done;
    const again = await searching({ at: [STONEBRIAR] });

    expect(settled.coverage.failed).toEqual(refused);
    expect(
      namedIn(settled.coverage).map((showtime) => showtime.startsAt),
    ).not.toContain(stonebriar[0]?.startsAt);
    expect(settled.coverage.checked).toBe(2);
    expect((await again.search.done).coverage.checked).toBe(4);
  });

  it("stops issuing requests when it is aborted and settles with what it knew", async () => {
    const run = await searching({});
    run.search.subscribe(() => {
      if (run.search.snapshot().results.length > 0) run.search.abort();
    });
    const settled = await run.search.done;

    expect(run.requested()).toHaveLength(WIDTH);
    expect(settled.phase).toBe("settled");
    expect(settled.results).toHaveLength(1);
    expect(settled.coverage.candidates - accountedIn(settled.coverage)).toBe(
      171,
    );
  });

  it("issues no seat map request at all when it is aborted while it is still resolving", async () => {
    const run = await searching({});
    run.search.abort();
    const settled = await run.search.done;

    expect(run.requested()).toEqual([]);
    expect(settled.phase).toBe("settled");
    expect(settled.coverage.candidates).toBe(176);
    expect(run.snapshots.map((snapshot) => snapshot.phase)).toEqual([
      "settled",
    ]);
  });

  it("hands back the same snapshot until something changes", async () => {
    const run = await searching({ at: [STONEBRIAR] });
    const first = run.search.snapshot();

    expect(run.search.snapshot()).toBe(first);
    expect(first).toEqual({
      results: [],
      coverage: {
        candidates: 0,
        checked: 0,
        soldOut: [],
        noSeatMap: [],
        started: [],
        salesOff: [],
        unidentified: [],
        failed: [],
      },
      phase: "resolving",
    });

    const settled = await run.search.done;

    expect(run.search.snapshot()).toBe(settled);
    expect(settled).not.toBe(first);
    expect(new Set(run.snapshots).size).toBe(run.snapshots.length);
  });

  it("stops telling a subscriber that has unsubscribed", async () => {
    const run = await searching({ at: [STONEBRIAR] });
    const heard: number[] = [];
    const stop = run.search.subscribe(() => heard.push(heard.length));
    stop();
    await run.search.done;

    expect(heard).toEqual([]);
    expect(run.snapshots.length).toBeGreaterThan(0);
  });

  it("reports what the filters removed from the room it ranked", async () => {
    const ordinary = await searching({
      at: [STONEBRIAR],
      rooms: ["561562311"],
    });
    const accessible = await searching({
      at: [STONEBRIAR],
      rooms: ["561562311"],
      accessibleSeating: true,
    });

    expect((await ordinary.search.done).results[0]?.removed).toEqual({
      unavailable: 27,
      accessible: 5,
    });
    expect((await accessible.search.done).results[0]?.removed).toEqual({
      unavailable: 27,
      accessible: 0,
    });
  });

  it("carries no ticketing URL on a result", async () => {
    const settled = await (await searching({ at: [STONEBRIAR] })).search.done;
    const result = settled.results[0];

    expect(result?.showtime).toEqual({
      id: 558117351,
      startsAt: expect.any(String),
      presentation: expect.any(Object),
    });
    expect(Object.keys(result?.showtime ?? {})).not.toContain("ticketing");
  });

  it("answers one Seat Group per Showtime, the best the room holds", async () => {
    const run = await searching({
      at: [STONEBRIAR],
      rooms: ["561562311", "561755033", "561783660", "558983758"],
    });
    const settled = await run.search.done;
    const result = settled.results.find(
      (found) => found.showtime.id === 558117351,
    );

    expect(settled.results).toHaveLength(4);
    expect(result?.seats.map((seat) => seat.id)).toEqual(["F9", "F8"]);
    expect(result?.podDividers).toBe(0);
    expect(result?.key).toBe("558117351:F9+F8");
    expect(result?.reasons).toEqual({
      againstWall: false,
      inFrontBand: false,
      rowCount: 8,
      rowFromFront: 6,
      seatsOffCentre: -1.9503424657534258,
      tiedAtRoomResolution: false,
    });
  });

  it("orders Showtimes that score alike by the Showtime they are", async () => {
    const run = await searching({
      at: [STONEBRIAR],
      rooms: ["561562311", "561562311", "561562311", "561562311"],
    });
    const settled = await run.search.done;

    expect(new Set(settled.results.map((result) => result.score)).size).toBe(1);
    expect(idsIn(settled)).toEqual([
      557985744, 558117351, 558782900, 558782901,
    ]);
    expect(idsIn(settled)).not.toEqual(arrivalIn(run.snapshots));
  });

  it("scores against the Seat Profile it is given", async () => {
    const front: SeatProfile = { ...REFERENCE, targetDepth: 0 };
    const reference = await searching({ at: [STONEBRIAR] });
    const nearest = await searching({ at: [STONEBRIAR], profile: front });

    expect(idsIn(await reference.search.done)).not.toEqual(
      idsIn(await nearest.search.done),
    );
  });

  it("counts a Showtime whose room cannot seat the party as checked and offers no result", async () => {
    const run = await searching({ at: [STONEBRIAR], partySize: 400 });
    const settled = await run.search.done;

    expect(settled.results).toEqual([]);
    expect(settled.coverage.checked).toBe(4);
    expect(accountedIn(settled.coverage)).toBe(5);
  });

  it("settles as unreachable when the listing cannot be read", async () => {
    const run = await searching({
      script: { sequences: { [LISTING]: [500, 500, 500] } },
    });
    const settled = await run.search.done;

    expect(settled).toEqual({
      results: [],
      coverage: {
        candidates: 0,
        checked: 0,
        soldOut: [],
        noSeatMap: [],
        started: [],
        salesOff: [],
        unidentified: [],
        failed: [],
      },
      phase: "unreachable",
    });
    expect(run.requested()).toEqual([]);
  });
});
