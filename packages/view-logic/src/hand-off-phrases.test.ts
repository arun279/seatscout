import type { SeatGroupResult } from "@seatscout/client";
import { beforeAll, describe, expect, it } from "vitest";
import {
  BACK_TO_THE_LIST,
  CHECK_AGAIN,
  checkingOf,
  handedOffOf,
  judgedOf,
  movedOnOf,
  NEXT_BEST,
  NEXT_BEST_MARK,
  NOTHING_WAS_HELD,
  NOTHING_WAS_READ,
  OFFLINE_AT_HAND_OFF,
  offNowOf,
  openingOf,
  placeOf,
  RE_CHECKED_THEN_OPENED,
  recheckedOf,
  showingOf,
  takeOf,
  UNCONFIRMED,
  uncheckedOf,
  UNREACHABLE,
  wentOf,
  whereTheyWereOf,
} from "./hand-off-phrases.js";
import { searched } from "./rooms.fixtures.js";

const HOOKY_ADDISON_9AM = 561527980;
const LEGACY_1030P = 561938043;
const LEWISVILLE_720P = 557882248;

let results: readonly SeatGroupResult[] = [];

const at = (showtime: number): SeatGroupResult => {
  const found = results.find((result) => result.showtime.id === showtime);
  if (found === undefined) throw new Error(`${showtime} was not ranked`);
  return found;
};

beforeAll(async () => {
  results = (await searched()).settled.results;
});

describe("what the hand-off says of the Seat Group it takes", () => {
  it("heads the sheet with the day, the time and every Format of the Showtime", () => {
    expect(showingOf(at(LEGACY_1030P), "2026-08-28")).toBe(
      "Today 10:30p · D-BOX · XD",
    );
    expect(showingOf(at(HOOKY_ADDISON_9AM), "2026-08-27")).toBe(
      "Tomorrow 9:00a · SDX",
    );
    expect(showingOf(at(LEWISVILLE_720P), "2026-08-28")).toBe("Today 7:20p");
  });

  it("names the seats the velvet control takes and the check it waits on", () => {
    const chosen = at(HOOKY_ADDISON_9AM);

    expect(takeOf(chosen)).toBe("Take G6 and G7");
    expect(checkingOf(chosen)).toBe("Checking G6 and G7 with the Source");
    expect(openingOf(chosen)).toBe(
      "Still there. Opening the ticketing page for 9:00a at Hooky Entertainment Addison + SDX.",
    );
  });

  it("dates each verdict's provenance by the age it is given", () => {
    expect(judgedOf("12s")).toBe("1 source · 12s ago · judged bookable");
    expect(recheckedOf("3s")).toBe("Re-checked at hand-off · 3s ago");
    expect(handedOffOf("1m 04s")).toBe("Hand-off · 1m 04s ago");
  });
});

describe("what the hand-off says when the Seat Group is taken", () => {
  it("says the seats went, and whether anything in the room replaces them", () => {
    const lost = at(HOOKY_ADDISON_9AM);

    expect(wentOf(lost, true)).toBe("G6 and G7 just went.");
    expect(wentOf(lost, false)).toBe(
      "G6 and G7 just went, and nothing in this room replaces them.",
    );
  });

  it("says the room moved on when there is a next best", () => {
    expect(movedOnOf("4s")).toBe(
      "The Source answered 4s ago: at least one of them went while you were deciding. seatscout never holds seats, so the room has moved on. The plan is redrawn.",
    );
  });

  it("names the party the room could no longer seat when there is none", () => {
    expect(offNowOf("9s", 2)).toBe(
      "The Source answered 9s ago and offered nothing else in this room for two seats together. This screening is no longer on offer to you: sold out, no longer offered by the listing, already begun, off sale, without a seat map, or simply short of two seats together, and the Source does not say which. seatscout never holds seats.",
    );
  });

  it("marks where the lost seats were and places each alternative by row and side", () => {
    expect(whereTheyWereOf(at(HOOKY_ADDISON_9AM))).toBe("where G6·G7 were");
    expect(placeOf(at(HOOKY_ADDISON_9AM))).toBe("Row 7 · on the centreline");
  });
});

describe("what the hand-off says when the Source could not be reached", () => {
  it("says nothing was checked and no checkout opens on it", () => {
    expect(uncheckedOf(at(HOOKY_ADDISON_9AM))).toBe(
      "Nothing was checked, so G6 and G7 may well still be there. A checkout never opens on an answer that could not be judged.",
    );
  });
});

describe("the lines the hand-off says as they are", () => {
  it("leaves none of them empty and says no two alike", () => {
    const said = [
      BACK_TO_THE_LIST,
      RE_CHECKED_THEN_OPENED,
      OFFLINE_AT_HAND_OFF,
      UNCONFIRMED,
      NOTHING_WAS_HELD,
      NOTHING_WAS_READ,
      NEXT_BEST,
      NEXT_BEST_MARK,
      UNREACHABLE,
      CHECK_AGAIN,
    ];

    expect(said.filter((line) => line.trim() === "")).toEqual([]);
    expect(new Set(said).size).toBe(said.length);
  });
});
