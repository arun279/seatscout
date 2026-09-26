import { describe, expect, it } from "vitest";
import { dayNameOf, markOf, monthNameOf, tapped } from "./calendar.js";
import { spanOf } from "./when.js";

const TODAY = "2026-09-26";

describe("a tap on a day of the calendar", () => {
  it("makes that day the one day", () => {
    expect(tapped("day", { date: TODAY }, "2026-09-30", TODAY)).toEqual({
      date: "2026-09-30",
    });
  });

  it("adds a day to some days, and takes one away when it is tapped again, never the last", () => {
    const one = tapped("days", { date: TODAY }, "2026-09-30", TODAY);
    const two = tapped("days", one, "2026-09-28", TODAY);

    expect(one).toEqual(spanOf([TODAY, "2026-09-30"], TODAY));
    expect(two).toEqual(spanOf([TODAY, "2026-09-28", "2026-09-30"], TODAY));
    expect(tapped("days", two, "2026-09-28", TODAY)).toEqual(one);
    expect(tapped("days", { date: "2026-09-30" }, "2026-09-30", TODAY)).toEqual(
      { date: "2026-09-30" },
    );
  });

  it("sets a range's first day and then its last, and starts again after a range is whole", () => {
    const first = tapped(
      "range",
      {
        date: TODAY,
        when: { kind: "range", first: TODAY, last: "2026-10-02" },
      },
      "2026-09-28",
      TODAY,
    );
    const whole = tapped("range", first, "2026-10-01", TODAY);

    expect(first).toEqual({ date: "2026-09-28" });
    expect(whole).toEqual({
      date: "2026-09-28",
      when: { kind: "range", first: "2026-09-28", last: "2026-10-01" },
    });
    expect(tapped("range", whole, "2026-09-29", TODAY)).toEqual({
      date: "2026-09-29",
    });
  });

  it("turns a range the right way round when its last day comes before its first", () => {
    expect(
      tapped("range", { date: "2026-09-29" }, "2026-09-27", TODAY),
    ).toEqual({
      date: "2026-09-27",
      when: { kind: "range", first: "2026-09-27", last: "2026-09-29" },
    });
    expect(
      tapped("range", { date: "2026-09-29" }, "2026-09-29", TODAY),
    ).toEqual({ date: "2026-09-29" });
  });

  it("changes nothing when the when is any day", () => {
    const any = spanOf(["any"], TODAY);

    expect(tapped("any", any, "2026-09-29", TODAY)).toBe(any);
  });
});

describe("how the calendar marks a day", () => {
  it("marks the days picked and nothing else", () => {
    const mark = markOf(spanOf([TODAY, "2026-09-30"], TODAY), TODAY);

    expect(["2026-09-25", TODAY, "2026-09-28", "2026-09-30"].map(mark)).toEqual(
      ["none", "picked", "none", "picked"],
    );
  });

  it("marks every one of several days picked as picked, and one day alone", () => {
    const several = markOf(
      spanOf([TODAY, "2026-09-28", "2026-09-30"], TODAY),
      TODAY,
    );
    const one = markOf({ date: "2026-09-28" }, TODAY);

    expect([TODAY, "2026-09-28", "2026-09-30"].map(several)).toEqual([
      "picked",
      "picked",
      "picked",
    ]);
    expect(["2026-09-27", "2026-09-28"].map(one)).toEqual(["none", "picked"]);
  });

  it("marks a range's ends as picked and the days between them as between", () => {
    const mark = markOf(spanOf(["2026-09-28..2026-10-01"], TODAY), TODAY);

    expect(
      [
        "2026-09-27",
        "2026-09-28",
        "2026-09-29",
        "2026-09-30",
        "2026-10-01",
        "2026-10-02",
      ].map(mark),
    ).toEqual(["none", "picked", "between", "between", "picked", "none"]);
  });

  it("marks any day as a range from today", () => {
    const mark = markOf(spanOf(["any"], TODAY), TODAY);

    expect([TODAY, "2026-09-29", "2026-10-02", "2026-10-03"].map(mark)).toEqual(
      ["picked", "between", "picked", "none"],
    );
  });
});

describe("the words the calendar says", () => {
  it("names a day in full for a screen reader, saying today and tomorrow first", () => {
    expect(dayNameOf(TODAY, TODAY)).toBe("Today, Saturday 26 September");
    expect(dayNameOf("2026-09-27", TODAY)).toBe(
      "Tomorrow, Sunday 27 September",
    );
    expect(dayNameOf("2026-10-05", TODAY)).toBe("Monday 5 October");
    expect(
      [
        "2026-09-28",
        "2026-09-29",
        "2026-09-30",
        "2026-10-01",
        "2026-10-02",
        "2026-10-03",
        "2026-10-04",
      ].map((date) => dayNameOf(date, TODAY)),
    ).toEqual([
      "Monday 28 September",
      "Tuesday 29 September",
      "Wednesday 30 September",
      "Thursday 1 October",
      "Friday 2 October",
      "Saturday 3 October",
      "Sunday 4 October",
    ]);
  });

  it("names a month by its name and year", () => {
    expect(
      Array.from({ length: 12 }, (_, at) =>
        monthNameOf(`2027-${String(at + 1).padStart(2, "0")}-15`),
      ),
    ).toEqual([
      "January 2027",
      "February 2027",
      "March 2027",
      "April 2027",
      "May 2027",
      "June 2027",
      "July 2027",
      "August 2027",
      "September 2027",
      "October 2027",
      "November 2027",
      "December 2027",
    ]);
  });
});
