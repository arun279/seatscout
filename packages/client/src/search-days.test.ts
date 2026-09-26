import { describe, expect, it } from "vitest";
import {
  LISTING,
  listing,
  SEAT_MAP,
  searching,
  TODAY,
  WIDTH,
} from "./search.fixtures.js";
import type { Snapshot } from "./search.js";

const EARLIER = "2026-08-27";
const LATER = "2026-08-29";
const ACROSS = {
  days: [
    [LATER, "246329/2026-08-28"],
    [EARLIER, "245569/2026-08-27"],
  ],
  script: { standInAuditoriums: true },
} as const;

const datesIn = (snapshot: Snapshot) =>
  snapshot.results.map((result) => result.terms.date);

const refusingEvery = async () => {
  const run = await searching({
    script: { faults: [{ status: 403, percent: 100 }] },
    cached: (catalogue) => ({ fetchedAt: 1000, catalogue }),
  });
  return { run, settled: await run.search.done };
};

describe("a search's budget", () => {
  it("reads every seat map of a one-day search, as a one-day search always has", async () => {
    const run = await searching({});
    const settled = await run.search.done;

    expect(run.requested()).toHaveLength(172);
    expect(settled.days).toEqual([
      { date: TODAY, read: 172, reading: 0, unread: 0 },
    ]);
  });

  it("asks for no more than 48 seat maps over several days, the first 48 the nearest listing names", async () => {
    const run = await searching(ACROSS);
    const settled = await run.search.done;

    expect(run.requested()).toEqual(
      run.candidates.bookable.slice(0, 48).map((showtime) => showtime.id),
    );
    expect(settled.phase).toBe("settled");
    expect(settled.coverage.checked).toBe(48);
  });

  it("says what is being read while it reads", async () => {
    const run = await searching(ACROSS);
    await run.search.done;

    expect(run.snapshots[0]?.days).toEqual([
      { date: EARLIER, read: 0, reading: 0, unread: 0 },
      { date: TODAY, read: 0, reading: 48, unread: 124 },
      { date: LATER, read: 0, reading: 0, unread: 172 },
    ]);
    expect(run.snapshots.at(-2)?.days).toEqual([
      { date: EARLIER, read: 0, reading: 0, unread: 0 },
      { date: TODAY, read: 48, reading: 0, unread: 124 },
      { date: LATER, read: 0, reading: 0, unread: 172 },
    ]);
  });

  it("reads the next 48 only when asked, never one it has already read", async () => {
    const run = await searching(ACROSS);
    await run.search.done;

    const more = await run.search.readMore();

    expect(run.requested()).toEqual(
      run.candidates.bookable.slice(0, 96).map((showtime) => showtime.id),
    );
    expect(more.coverage.checked).toBe(96);
    expect(more.days[1]).toEqual({
      date: TODAY,
      read: 96,
      reading: 0,
      unread: 76,
    });
    expect(run.search.snapshot()).toBe(more);
  });

  it("asks for nothing more once every seat map is read", async () => {
    const run = await searching({ at: ["AMC Stonebriar 24"] });
    const settled = await run.search.done;
    const seen = run.snapshots.length;

    expect(await run.search.readMore()).toBe(settled);
    expect(run.requested()).toHaveLength(4);
    expect(run.snapshots).toHaveLength(seen);
  });
});

describe("a search over several days", () => {
  it("reads every day's listing, one request each, before any seat map", async () => {
    const run = await searching(ACROSS);
    await run.search.done;
    const asked = run.paths();

    expect(asked.slice(0, 3).toSorted()).toEqual([
      "/napi/theaterShowtimeGroupings/245569/2026-08-27",
      LISTING,
      "/napi/theaterShowtimeGroupings/245569/2026-08-29",
    ]);
    expect(asked.slice(3).every((path) => path.startsWith(SEAT_MAP))).toBe(
      true,
    );
  });

  it("counts every day's candidates and checks the nearest day first", async () => {
    const run = await searching(ACROSS);
    const settled = await run.search.done;

    expect(settled.coverage.candidates).toBe(431);
    expect(settled.days).toEqual([
      { date: EARLIER, read: 0, reading: 0, unread: 0 },
      { date: TODAY, read: 48, reading: 0, unread: 124 },
      { date: LATER, read: 0, reading: 0, unread: 172 },
    ]);
    expect(new Set(datesIn(settled))).toEqual(new Set([TODAY]));
  });

  it("moves on to the next day when a person asks for more, and bands the list by day, nearest first", async () => {
    const run = await searching(ACROSS);
    await run.search.done;

    await run.search.readMore();
    await run.search.readMore();
    const more = await run.search.readMore();
    const dates = datesIn(more);

    expect(run.requested()).toHaveLength(192);
    expect(new Set(run.requested()).size).toBe(192);
    expect(more.days).toEqual([
      { date: EARLIER, read: 0, reading: 0, unread: 0 },
      { date: TODAY, read: 172, reading: 0, unread: 0 },
      { date: LATER, read: 20, reading: 0, unread: 152 },
    ]);
    expect(dates).toEqual(dates.toSorted());
    expect(dates.at(-1)).toBe(LATER);
    for (const day of [TODAY, LATER]) {
      const scores = more.results
        .filter((result) => result.terms.date === day)
        .map((result) => result.score);
      expect(scores).toEqual(scores.toSorted((a, b) => b - a));
    }
  });
});

describe("a search's time window", () => {
  it("holds each day's showtimes to the same hours of that day", async () => {
    const listed = await listing();
    const run = await searching({
      window: { from: "21:00", until: "22:00" },
      days: [[LATER, "246329/2026-08-28"]],
      script: { standInAuditoriums: true },
    });
    const settled = await run.search.done;
    const startsAt = new Map<number, string>(
      listed.bookable.map((showtime) => [showtime.id, showtime.startsAt]),
    );

    expect(settled.coverage.candidates).toBe(15);
    expect(settled.days).toEqual([
      { date: TODAY, read: 15, reading: 0, unread: 0 },
      { date: LATER, read: 0, reading: 0, unread: 0 },
    ]);
    expect(
      run.requested().filter((id) => {
        const at = startsAt.get(id) ?? "";
        return at < "2026-08-28T21:00" || at >= "2026-08-28T22:00";
      }),
    ).toEqual([]);
  });
});

describe("a search's days without a window", () => {
  it("keeps every showtime a day's listing names, whatever date it starts on, and reads that nearer day first", async () => {
    const run = await searching({
      days: [[EARLIER, "246329/2026-08-28"]],
      script: { standInAuditoriums: true },
    });
    const settled = await run.search.done;

    expect(settled.coverage.candidates).toBe(351);
    expect(settled.days[0]).toEqual({
      date: EARLIER,
      read: 48,
      reading: 0,
      unread: 124,
    });
  });

  it("starts no second step while the first is still reading", async () => {
    const run = await searching(ACROSS);
    const asked: Promise<Snapshot>[] = [];
    run.search.subscribe(() => {
      if (asked.length === 0) asked.push(run.search.readMore());
    });

    const settled = await run.search.done;

    expect(await asked[0]).toBe(settled);
    expect(run.requested()).toHaveLength(48);
  });
});

describe("a search the Source refuses", () => {
  it("stops at the first refusal, asks no seat map again, and counts nothing it was refused as read", async () => {
    const { run, settled } = await refusingEvery();

    expect(run.requested()).toHaveLength(WIDTH);
    expect(settled.refused).toBe(true);
    expect(settled.phase).toBe("settled");
    expect(settled.coverage.checked).toBe(0);
    expect(settled.coverage.failed).toEqual([]);
    expect(settled.days).toEqual([
      { date: TODAY, read: 0, reading: 0, unread: 172 },
    ]);
  });

  it("neither reads more nor retries into the refusal", async () => {
    const { run, settled } = await refusingEvery();

    expect(await run.search.readMore()).toBe(settled);
    expect(await run.search.retry()).toBe(settled);
    expect(run.requested()).toHaveLength(WIDTH);
  });

  it("keeps what it read before the refusal and names the rest as not read yet", async () => {
    const run = await searching({
      answers: (bookable) =>
        Object.fromEntries(
          bookable
            .slice(30)
            .map((showtime) => [`${SEAT_MAP}${showtime.id}`, { status: 403 }]),
        ),
    });
    const settled = await run.search.done;
    const [day] = settled.days;

    expect(settled.refused).toBe(true);
    expect(settled.coverage.checked).toBe(30);
    expect(settled.results.length).toBeGreaterThan(0);
    expect(day).toEqual({ date: TODAY, read: 30, reading: 0, unread: 142 });
    expect(run.requested().length).toBeLessThan(172);
    expect(await run.search.readMore()).toBe(settled);
  });

  it("says it was refused when one day's listing was refused and another was read", async () => {
    const run = await searching({
      ...ACROSS,
      script: {
        ...ACROSS.script,
        sequences: { [LISTING]: [403] },
      },
    });
    const settled = await run.search.done;

    expect(settled.phase).toBe("unreachable");
    expect(settled.refused).toBe(true);
  });

  it("stops before any seat map when the listing is refused, and does not ask again", async () => {
    const run = await searching({
      script: { sequences: { [LISTING]: [403, 200] } },
    });
    const settled = await run.search.done;

    const again = await run.search.retry();

    expect(settled.phase).toBe("unreachable");
    expect(settled.refused).toBe(true);
    expect(again).toBe(settled);
    expect(run.paths()).toEqual([LISTING]);
  });
});
