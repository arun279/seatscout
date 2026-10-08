import type { SeatGroupResult } from "@seatscout/client";
import { beforeAll, describe, expect, it } from "vitest";
import {
  BACK_TO_THE_LIST,
  CHECK_AGAIN,
  checkingOf,
  judgedOf,
  MOVED_ON,
  NEXT_BEST,
  NEXT_BEST_MARK,
  OFFLINE_AT_HAND_OFF,
  offNowOf,
  openingOf,
  placeOf,
  RE_CHECKED_THEN_OPENED,
  recheckedOf,
  showingOf,
  takeOf,
  triedOf,
  UNCONFIRMED,
  uncheckedOf,
  UNREACHABLE,
  wentOf,
  whereTheyWereOf,
  yoursOf,
} from "./hand-off-phrases.js";
import { searched } from "./rooms.fixtures.js";

const HOOKY_ADDISON_9AM = 564424799;
const LEGACY_1035P = 562413965;
const LEWISVILLE_830P = 562433541;

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
    expect(showingOf(at(LEGACY_1035P), "2026-09-20")).toBe(
      "Today 10:35p · D-BOX · XD",
    );
    expect(showingOf(at(HOOKY_ADDISON_9AM), "2026-09-19")).toBe(
      "Tomorrow 9:00a · SDX",
    );
    expect(showingOf(at(LEWISVILLE_830P), "2026-09-20")).toBe("Today 8:30p");
  });

  it("names the seats the velvet control takes and the check it waits on", () => {
    const chosen = at(HOOKY_ADDISON_9AM);

    expect(takeOf(chosen)).toBe("Take E12 and E11");
    expect(yoursOf(chosen)).toBe("E12·E11, yours");
    expect(checkingOf(chosen)).toBe(
      "Checking that E12 and E11 are still there",
    );
    expect(checkingOf({ ...chosen, seats: chosen.seats.slice(0, 1) })).toBe(
      "Checking that E12 is still there",
    );
    expect(openingOf(chosen)).toBe(
      "Still there. Opening the ticket site for 9:00a at Hooky Entertainment Addison + SDX.",
    );
  });

  it("dates each verdict's provenance by the age it is given", () => {
    expect(judgedOf("12s")).toBe("Bookable when read 12s ago");
    expect(recheckedOf("3s")).toBe("Checked again 3s ago");
    expect(triedOf("1m 04s")).toBe("Tried 1m 04s ago");
  });
});

describe("what the hand-off says when the Seat Group is taken", () => {
  it("says the seats went, and whether anything in the room replaces them", () => {
    const lost = at(HOOKY_ADDISON_9AM);

    expect(wentOf(lost, true)).toBe("E12 and E11 just went.");
    expect(wentOf(lost, false)).toBe(
      "E12 and E11 just went, and nothing in this room replaces them.",
    );
  });

  it("says why seats can go when there is a next best", () => {
    expect(MOVED_ON).toBe(
      "SeatScout never holds seats, so others can take them while you decide.",
    );
  });

  it("names the party the room could no longer seat when there is none", () => {
    expect(offNowOf(2)).toBe(
      "This showing may be sold out, off sale, already started or short of two seats together, and the ticket site does not say which.",
    );
    expect(offNowOf(1)).toBe(
      "This showing may be sold out, off sale, already started or short of one seat, and the ticket site does not say which.",
    );
  });

  it("marks where the lost seats were and places each alternative by row and side", () => {
    expect(whereTheyWereOf(at(HOOKY_ADDISON_9AM))).toBe("where E12·E11 were");
    expect(placeOf(at(HOOKY_ADDISON_9AM))).toBe("Row 5 · on the centreline");
  });
});

describe("what the hand-off says when the ticket site could not be reached", () => {
  it("says the seats may still be there and the ticket site opens only after a check", () => {
    expect(uncheckedOf(at(HOOKY_ADDISON_9AM))).toBe(
      "E12 and E11 may still be there. SeatScout only opens the ticket site after a check.",
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
      MOVED_ON,
      NEXT_BEST,
      NEXT_BEST_MARK,
      UNREACHABLE,
      CHECK_AGAIN,
    ];

    expect(said.filter((line) => line.trim() === "")).toEqual([]);
    expect(new Set(said).size).toBe(said.length);
  });
});
