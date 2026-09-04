import { describe, expect, it } from "vitest";
import {
  AT,
  INWOOD,
  STONEBRIAR,
  VILLAGE,
  accountedIn,
  arrivalIn,
  idsIn,
  namedIn,
  refusalNamed,
  routesTo,
  searching,
  stoppedSelling,
  withoutIdentity,
} from "./search.fixtures.js";

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
      558117351, 557985744, 558782901, 558782900,
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
});
