import { describe, expect, it } from "vitest";
import {
  ageOf,
  clockOf,
  dayOf,
  lateralOf,
  noneOf,
  partyOf,
  whenOf,
  whyOf,
} from "./phrases.js";

const REASONS = {
  rowFromFront: 7,
  rowCount: 10,
  seatsOffCentre: 0,
  inFrontBand: false,
  againstWall: false,
  tiedAtRoomResolution: true,
};

describe("the words a card uses", () => {
  it("states a Showtime's clock time as the listing states it, in the Theater's own zone", () => {
    expect(clockOf("2026-08-28T16:20:00-05:00")).toBe("4:20p");
    expect(clockOf("2026-08-28T10:15:00-05:00")).toBe("10:15a");
    expect(clockOf("2026-08-28T00:05:00-05:00")).toBe("12:05a");
    expect(clockOf("2026-08-28T12:00:00-05:00")).toBe("12:00p");
    expect(clockOf("2026-08-28T23:45:00+01:00")).toBe("11:45p");
  });

  it("counts an age up in seconds, then minutes and seconds from the sixtieth second, then hours and minutes from the sixtieth minute", () => {
    expect(ageOf(1000, 9400)).toBe("8s");
    expect(ageOf(0, 59_999)).toBe("59s");
    expect(ageOf(0, 60_000)).toBe("1m 00s");
    expect(ageOf(0, 220_000)).toBe("3m 40s");
    expect(ageOf(0, 363_000)).toBe("6m 03s");
    expect(ageOf(0, 3_599_000)).toBe("59m 59s");
    expect(ageOf(0, 3_600_000)).toBe("1h 00m");
    expect(ageOf(0, 8_040_000)).toBe("2h 14m");
    expect(ageOf(5000, 4000)).toBe("0s");
  });

  it("names where a Seat Group sits across the row in seats from the centreline, and calls a pair astride it central", () => {
    expect(lateralOf(0)).toBe("on the centreline");
    expect(lateralOf(0.5)).toBe("on the centreline");
    expect(lateralOf(-0.5)).toBe("on the centreline");
    expect(lateralOf(0.7)).toBe("on the centreline");
    expect(lateralOf(0.75)).toBe("one seat right of centre");
    expect(lateralOf(1)).toBe("one seat right of centre");
    expect(lateralOf(1.3)).toBe("one and a half seats right of centre");
    expect(lateralOf(-1.9503424657534258)).toBe("two seats left of centre");
    expect(lateralOf(6.5)).toBe("six and a half seats right of centre");
    expect(lateralOf(9.5)).toBe("nine and a half seats right of centre");
    expect(lateralOf(10)).toBe("10 seats right of centre");
    expect(lateralOf(-10.3)).toBe("10½ seats left of centre");
    expect(lateralOf(-12.2)).toBe("12 seats left of centre");
  });

  it.each([
    [1, "One seat"],
    [2, "Two seats together"],
    [3, "Three seats together"],
    [4, "Four seats together"],
    [5, "Five seats together"],
    [6, "Six seats together"],
    [7, "Seven seats together"],
    [8, "Eight seats together"],
    [9, "Nine seats together"],
    [12, "12 seats together"],
  ])(
    "names a party of %i as the title card announces it: %s",
    (party, said) => {
      expect(partyOf(party)).toBe(said);
    },
  );

  it("names a date as today, tomorrow, or the day it is", () => {
    expect(dayOf("2026-08-28", "2026-08-28")).toBe("Today");
    expect(dayOf("2026-08-29", "2026-08-28")).toBe("Tomorrow");
    expect(dayOf("2026-09-04", "2026-08-28")).toBe("Fri 4 Sep");
    expect(dayOf("2026-08-27", "2026-08-28")).toBe("Thu 27 Aug");
  });

  it.each([
    ["2026-01-04", "Sun 4 Jan"],
    ["2026-02-02", "Mon 2 Feb"],
    ["2026-03-03", "Tue 3 Mar"],
    ["2026-04-01", "Wed 1 Apr"],
    ["2026-05-07", "Thu 7 May"],
    ["2026-06-05", "Fri 5 Jun"],
    ["2026-07-04", "Sat 4 Jul"],
    ["2026-08-02", "Sun 2 Aug"],
    ["2026-09-01", "Tue 1 Sep"],
    ["2026-10-01", "Thu 1 Oct"],
    ["2026-11-02", "Mon 2 Nov"],
    ["2026-12-02", "Wed 2 Dec"],
  ])("names %s as %s, in English abbreviations", (date, said) => {
    expect(dayOf(date, "2025-12-31")).toBe(said);
  });

  it("says when a no applies, inside a sentence", () => {
    expect(whenOf("2026-08-28", "2026-08-28")).toBe("today");
    expect(whenOf("2026-08-29", "2026-08-28")).toBe("tomorrow");
    expect(whenOf("2026-09-04", "2026-08-28")).toBe("on Fri 4 Sep");
  });

  it("says what there was none of", () => {
    expect(noneOf(1)).toBe("No seat");
    expect(noneOf(2)).toBe("No two seats together");
    expect(noneOf(400)).toBe("No 400 seats together");
  });

  it("says why a Seat Group ranked where it did, as the row, the offset, and what it was penalised for", () => {
    expect(whyOf(REASONS, 0)).toBe("Row 7 of 10 · on the centreline");
    expect(
      whyOf(
        { ...REASONS, seatsOffCentre: -1, inFrontBand: true, rowFromFront: 1 },
        0,
      ),
    ).toBe("Row 1 of 10 · one seat left of centre · in the front rows");
    expect(whyOf({ ...REASONS, againstWall: true }, 1)).toBe(
      "Row 7 of 10 · on the centreline · against a wall · across a console",
    );
    expect(whyOf(REASONS, 2)).toBe(
      "Row 7 of 10 · on the centreline · across two consoles",
    );
  });
});
