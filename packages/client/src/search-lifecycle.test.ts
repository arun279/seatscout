import { narrowed } from "@seatscout/core";
import { describe, expect, it } from "vitest";
import {
  accountedIn,
  LISTING,
  listing,
  namedIn,
  SEAT_MAP,
  STONEBRIAR,
  searching,
  theaterIn,
  WIDTH,
} from "./search.fixtures.js";

describe("a search in flight", () => {
  it("names the Showtimes it could not reach with their Theater and time, and reaches them once the fault is gone", async () => {
    const listed = await listing();
    const stonebriar = narrowed(listed, {
      theaters: [theaterIn(listed, STONEBRIAR)],
    }).bookable;
    const refused = stonebriar.slice(0, 2);
    const run = await searching({
      at: [STONEBRIAR],
      script: {
        sequences: Object.fromEntries(
          refused.map((showtime) => [
            `${SEAT_MAP}${showtime.id}`,
            [500, 500, 500],
          ]),
        ),
      },
    });
    const settled = await run.search.done;
    const again = await searching({ at: [STONEBRIAR] });

    expect(settled.coverage.failed).toEqual(refused);
    expect(
      settled.coverage.failed.map((showtime) => [
        showtime.presentation.theater.name,
        showtime.startsAt,
      ]),
    ).toEqual([
      [STONEBRIAR, "2026-08-28T16:20:00-05:00"],
      [STONEBRIAR, "2026-08-28T18:00:00-05:00"],
    ]);
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
