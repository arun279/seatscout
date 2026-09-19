import { REFERENCE } from "@seatscout/client";
import { describe, expect, it } from "vitest";
import {
  ageOf,
  clockOf,
  dayOf,
  labelOf,
  lateralOf,
  noneOf,
  FIND_SEATS,
  ledeOf,
  NOTHING_REMEMBERED,
  partyOf,
  saidOf,
  seatOf,
  seatSetOf,
  spokenOf,
  whenOf,
  whyOf,
} from "./phrases.js";
import { openedRooms, WEST_PLANO_28 } from "./rooms.fixtures.js";

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

  it("labels a Seat Group by its Seats in the order it holds them, a dot between them, speaks them with an and, and gives a lone Seat by itself", async () => {
    const rooms = await openedRooms();
    const [first] = rooms;
    if (first === undefined) throw new Error("no room was opened");
    const alone = { ...first.result, seats: first.result.seats.slice(0, 1) };

    expect(rooms.map(({ result }) => labelOf(result))).toEqual([
      "H14·H13",
      "L11·L10",
      "G14·G13",
      "608·609",
      "D8·D7",
    ]);
    expect(rooms.map(({ result }) => spokenOf(result))).toEqual([
      "H14 and H13",
      "L11 and L10",
      "G14 and G13",
      "608 and 609",
      "D8 and D7",
    ]);
    expect(labelOf(alone)).toBe("H14");
    expect(spokenOf(alone)).toBe("H14");
  });

  it("puts a comma between every Seat of a larger group but the last, which keeps the and", async () => {
    const [room] = await openedRooms(
      {
        movie: "245569",
        date: "2026-08-28",
        area: "75006",
        partySize: 3,
        accessibleSeating: false,
      },
      [WEST_PLANO_28],
    );
    if (room === undefined) throw new Error("no room was opened");

    expect(labelOf(room.result)).toBe("H15·H14·H13");
    expect(spokenOf(room.result)).toBe("H15, H14 and H13");
  });

  it("names the Seat Profile as the Reference seat only while every part of it is the Reference's", () => {
    expect(seatOf(REFERENCE)).toBe("Reference seat");
    expect(seatOf({ ...REFERENCE })).toBe("Reference seat");
    expect(seatOf({ ...REFERENCE, targetDepth: 0 })).toBe("Custom seat");
  });

  it("names the Seat Profile already set, inside a sentence", () => {
    expect(seatSetOf(REFERENCE)).toBe("the Reference seat");
    expect(seatSetOf({ ...REFERENCE, targetDepth: 0 })).toBe(
      "your custom seat",
    );
  });

  it("opens the prompt with what to name next, then the party, the day and the seat already set", () => {
    const said = ledeOf(
      { date: "2026-08-29", partySize: 2 },
      REFERENCE,
      "2026-08-28",
    );

    expect(said.startsWith("Name an area")).toBe(true);
    expect(said).toContain(partyOf(2));
    expect(said).toContain(whenOf("2026-08-29", "2026-08-28"));
    expect(said).toContain(seatSetOf(REFERENCE));
  });

  it("gives a control and an empty history words of their own, because an empty one names nothing", () => {
    expect(FIND_SEATS.trim()).not.toHaveLength(0);
    expect(NOTHING_REMEMBERED.trim()).not.toHaveLength(0);
  });

  it("says a remembered search as its party, its day in the running text and its area", () => {
    const search = { movie: "243819", date: "2026-08-29", area: "75234" };

    expect(saidOf({ ...search, partySize: 4 }, "2026-08-28")).toBe(
      "4 seats · tomorrow · 75234",
    );
    expect(saidOf({ ...search, partySize: 1 }, "2026-08-29")).toBe(
      "1 seat · today · 75234",
    );
    expect(saidOf({ ...search, partySize: 2 }, "2026-08-22")).toBe(
      "2 seats · Sat 29 Aug · 75234",
    );
  });
});
