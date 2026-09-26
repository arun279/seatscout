import { describe, expect, it } from "vitest";
import { daysIn, isPast, spanIn, spanOf, valuesOf } from "./when.js";

const TODAY = "2026-09-03";

describe("the days a Query's when term holds", () => {
  it("holds one day when the address names one date", () => {
    expect(spanOf(["2026-09-05"], TODAY)).toEqual({ date: "2026-09-05" });
  });

  it("falls back to today when the address names no date it can read", () => {
    expect(spanOf([], TODAY)).toEqual({ date: TODAY });
    expect(spanOf(["tomorrow"], TODAY)).toEqual({ date: TODAY });
  });

  it("holds several days picked, nearest first and each once", () => {
    expect(
      spanOf(["2026-09-06", "2026-09-04", "2026-09-06", "later"], TODAY),
    ).toEqual({
      date: "2026-09-04",
      when: { kind: "days", dates: ["2026-09-04", "2026-09-06"] },
    });
  });

  it("holds one day when several named are the same day", () => {
    expect(spanOf(["2026-09-06", "2026-09-06"], TODAY)).toEqual({
      date: "2026-09-06",
    });
  });

  it("holds a range from its first day to its last, whichever way it was written", () => {
    const range = {
      date: "2026-09-04",
      when: { kind: "range", first: "2026-09-04", last: "2026-09-13" },
    };

    expect(spanOf(["2026-09-04..2026-09-13"], TODAY)).toEqual(range);
    expect(spanOf(["2026-09-13..2026-09-04"], TODAY)).toEqual(range);
  });

  it("holds a range that starts and ends on one day as that day", () => {
    expect(spanOf(["2026-09-04..2026-09-04"], TODAY)).toEqual({
      date: "2026-09-04",
    });
  });

  it("takes a range only between two dates in the form a listing is asked by", () => {
    expect(spanOf(["2026-09-04..soon"], TODAY)).toEqual({ date: TODAY });
    expect(spanOf(["x2026-09-04..2026-09-13"], TODAY)).toEqual({
      date: TODAY,
    });
    expect(spanOf(["2026-09-04..2026-09-13x"], TODAY)).toEqual({
      date: TODAY,
    });
  });

  it("holds any day from today when the address asks for any", () => {
    expect(spanOf(["any"], TODAY)).toEqual({
      date: TODAY,
      when: { kind: "any" },
    });
  });

  it("writes each reading back as the date values it was read from", () => {
    for (const asked of [
      ["2026-09-05"],
      ["2026-09-04", "2026-09-06"],
      ["2026-09-04..2026-09-13"],
      ["any"],
    ])
      expect(valuesOf(spanOf(asked, TODAY))).toEqual(asked);
  });

  it("names every day it holds, nearest first", () => {
    expect(daysIn(spanOf(["2026-09-05"], TODAY), TODAY)).toEqual([
      "2026-09-05",
    ]);
    expect(daysIn(spanOf(["2026-09-06", "2026-09-04"], TODAY), TODAY)).toEqual([
      "2026-09-04",
      "2026-09-06",
    ]);
    expect(daysIn(spanOf(["2026-09-29..2026-10-02"], TODAY), TODAY)).toEqual([
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
    ]);
  });

  it("reads any day as the horizon's days from today", () => {
    expect(daysIn(spanOf(["any"], TODAY), TODAY)).toEqual([
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
      "2026-09-06",
      "2026-09-07",
      "2026-09-08",
      "2026-09-09",
    ]);
  });

  it("starts each kind of when on the day the query holds, and any day on today", () => {
    expect(spanIn("day", "2026-09-29", TODAY)).toEqual({ date: "2026-09-29" });
    expect(spanIn("days", "2026-09-29", TODAY)).toEqual({ date: "2026-09-29" });
    expect(spanIn("range", "2026-09-29", TODAY)).toEqual({
      date: "2026-09-29",
      when: { kind: "range", first: "2026-09-29", last: "2026-10-05" },
    });
    expect(spanIn("any", "2026-09-29", TODAY)).toEqual({
      date: TODAY,
      when: { kind: "any" },
    });
  });

  it("reads any and a range only when the address names nothing beside them", () => {
    expect(spanOf(["any", "2026-09-05"], TODAY)).toEqual({
      date: "2026-09-05",
    });
    expect(spanOf(["2026-09-04..2026-09-13", "2026-09-05"], TODAY)).toEqual({
      date: "2026-09-05",
    });
  });
});

describe("a remembered search's days against today", () => {
  it("is past only once its last day is before today", () => {
    const today = "2026-08-28";

    expect(isPast(["2026-08-27"], today)).toBe(true);
    expect(isPast([today], today)).toBe(false);
    expect(isPast(["2026-08-20", today], today)).toBe(false);
    expect(isPast(["2026-08-20..2026-08-27"], today)).toBe(true);
    expect(isPast(["2026-08-20..2026-08-28"], today)).toBe(false);
    expect(isPast(["any"], today)).toBe(false);
  });
});
