import { describe, expect, it } from "vitest";
import {
  ACROSS,
  LATER,
  LATEST,
  LISTING,
  listing,
  SEAT_MAP,
  searching,
  TODAY,
} from "./search.fixtures.js";
import type { Snapshot } from "./search.js";

const EARLIER = "2026-09-19";

const datesIn = (snapshot: Snapshot) =>
  snapshot.results.map((result) => result.terms.date);

describe("a search's budget", () => {
  it("reads every seat map of a one-day search, as a one-day search always has", async () => {
    const run = await searching({});
    const settled = await run.search.done;

    expect(run.requested()).toHaveLength(494);
    expect(settled.days).toEqual([
      { date: TODAY, read: 494, reading: 0, unread: 0 },
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
      { date: TODAY, read: 0, reading: 48, unread: 446 },
      { date: LATER, read: 0, reading: 0, unread: 163 },
      { date: LATEST, read: 0, reading: 0, unread: 120 },
    ]);
    expect(run.snapshots.at(-2)?.days).toEqual([
      { date: TODAY, read: 48, reading: 0, unread: 446 },
      { date: LATER, read: 0, reading: 0, unread: 163 },
      { date: LATEST, read: 0, reading: 0, unread: 120 },
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
    expect(more.days[0]).toEqual({
      date: TODAY,
      read: 96,
      reading: 0,
      unread: 398,
    });
    expect(run.search.snapshot()).toBe(more);
  });

  it("reads the next 48 while one day has seat maps left, though another has none to read", async () => {
    const run = await searching({
      window: { from: "19:00", until: "23:00" },
      days: [[LATER, "246473/2026-09-20"]],
      script: { standInAuditoriums: true },
    });
    await run.search.done;

    const more = await run.search.readMore();

    expect(run.requested()).toHaveLength(96);
    expect(more.days).toEqual([
      { date: TODAY, read: 96, reading: 0, unread: 58 },
      { date: LATER, read: 0, reading: 0, unread: 0 },
    ]);
  });

  it("asks for nothing more once every seat map is read", async () => {
    const run = await searching({ at: ["AMC Stonebriar 24"] });
    const settled = await run.search.done;
    const seen = run.snapshots.length;

    expect(await run.search.readMore()).toBe(settled);
    expect(run.requested()).toHaveLength(18);
    expect(run.snapshots).toHaveLength(seen);
  });
});

describe("a search over several days", () => {
  it("reads every day's listing, one request each, before any seat map", async () => {
    const run = await searching(ACROSS);
    await run.search.done;
    const asked = run.paths();

    expect(asked.slice(0, 3).toSorted()).toEqual([
      LISTING,
      "/napi/theaterShowtimeGroupings/245893/2026-09-21",
      "/napi/theaterShowtimeGroupings/245893/2026-09-22",
    ]);
    expect(asked.slice(3).every((path) => path.startsWith(SEAT_MAP))).toBe(
      true,
    );
  });

  it("counts every day's candidates and checks the nearest day first", async () => {
    const run = await searching(ACROSS);
    const settled = await run.search.done;

    expect(settled.coverage.candidates).toBe(792);
    expect(settled.days).toEqual([
      { date: TODAY, read: 48, reading: 0, unread: 446 },
      { date: LATER, read: 0, reading: 0, unread: 163 },
      { date: LATEST, read: 0, reading: 0, unread: 120 },
    ]);
    expect(new Set(datesIn(settled))).toEqual(new Set([TODAY]));
  });

  it("moves on to the next day when a person asks for more, and bands the list by day, nearest first", async () => {
    const run = await searching(ACROSS);
    await run.search.done;

    for (let step = 1; step < 10; step += 1) await run.search.readMore();
    const more = await run.search.readMore();
    const dates = datesIn(more);

    expect(run.requested()).toHaveLength(528);
    expect(new Set(run.requested()).size).toBe(528);
    expect(more.days).toEqual([
      { date: TODAY, read: 494, reading: 0, unread: 0 },
      { date: LATER, read: 34, reading: 0, unread: 129 },
      { date: LATEST, read: 0, reading: 0, unread: 120 },
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
      days: [[LATER, "246473/2026-09-20"]],
      script: { standInAuditoriums: true },
    });
    const settled = await run.search.done;
    const startsAt = new Map<number, string>(
      listed.bookable.map((showtime) => [showtime.id, showtime.startsAt]),
    );

    expect(settled.coverage.candidates).toBe(40);
    expect(settled.days).toEqual([
      { date: TODAY, read: 39, reading: 0, unread: 0 },
      { date: LATER, read: 0, reading: 0, unread: 0 },
    ]);
    expect(
      run.requested().filter((id) => {
        const at = startsAt.get(id) ?? "";
        return at < "2026-09-20T21:00" || at >= "2026-09-20T22:00";
      }),
    ).toEqual([]);
  });
});

describe("a search's days without a window", () => {
  it("keeps every showtime a day's listing names, whatever date it starts on, and reads that nearer day first", async () => {
    const run = await searching({
      days: [[EARLIER, "246473/2026-09-20"]],
      script: { standInAuditoriums: true },
    });
    const settled = await run.search.done;

    expect(settled.coverage.candidates).toBe(672);
    expect(settled.days[0]).toEqual({
      date: EARLIER,
      read: 48,
      reading: 0,
      unread: 115,
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
