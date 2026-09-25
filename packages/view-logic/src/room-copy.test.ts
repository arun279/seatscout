import { beforeAll, describe, expect, it } from "vitest";
import {
  BACK_TO_THE_LIST,
  backToOf,
  CLEAR_OF_THE_FRONT,
  creditsOf,
  heldWhileOfflineOf,
  legendOf,
  notBookableIn,
  RE_CHECKED_ON_THE_TAP,
  readingOf,
  rowOf,
  UNCONFIRMED,
  WAITS_FOR_THE_CONNECTION,
  YOUR_SEATS_IN_THIS_ROOM,
} from "./auditorium-phrases.js";
import {
  type OpenedRoom,
  openedRooms,
  VILLAGE_1,
  WEST_PLANO_28,
} from "./rooms.fixtures.js";

let rooms: readonly OpenedRoom[] = [];

const openedRoom = (wanted: { readonly showtime: number }): OpenedRoom => {
  const found = rooms.find((room) => room.room.showtime === wanted.showtime);
  if (found === undefined) throw new Error("the room was not opened");
  return found;
};

beforeAll(async () => {
  rooms = await openedRooms(undefined, [WEST_PLANO_28, VILLAGE_1]);
});

describe("what the room says beside the map", () => {
  it("names the Seats the return control goes back to, spaced rather than joined", () => {
    expect(backToOf(openedRoom(VILLAGE_1).result)).toBe("Back to G14 G13");
  });

  it("counts the Seats a room will not sell against the Seats it has", () => {
    const { auditorium } = openedRoom(WEST_PLANO_28);

    expect(notBookableIn({ ...auditorium.map, bookableCount: 300 })).toBe(
      "4 of 304 not bookable",
    );
  });

  it("attests one reading and how old it is", () => {
    expect(readingOf(1000, 13_000)).toBe("1 source · read 12s ago");
  });

  it("says the chosen Seats are still drawn while the connection is gone", () => {
    expect(heldWhileOfflineOf(openedRoom(VILLAGE_1).result)).toBe(
      "G14 and G13 are here while you are offline.",
    );
  });
});

describe("the legend the map is read with", () => {
  it("names the chosen Seats first and marks the spaces as kept out", () => {
    const { result } = openedRoom(VILLAGE_1);

    expect(legendOf(result, false, false)).toEqual([
      { mark: "lit", words: "G14·G13, yours" },
      { mark: "forSale", words: "for sale" },
      { mark: "notBookable", words: "not bookable" },
      {
        mark: "space",
        words: "wheelchair or companion, kept out of ordinary results",
      },
    ]);
  });

  it("drops the caveat once the query asked for accessible seating", () => {
    const { result } = openedRoom(VILLAGE_1);

    expect(legendOf(result, true, false).map((entry) => entry.words)).toContain(
      "wheelchair or companion",
    );
  });

  it("adds the console only where the room has one", () => {
    const { result } = openedRoom(VILLAGE_1);

    expect(legendOf(result, false, true).at(-1)).toEqual({
      mark: "console",
      words: "console",
    });
    expect(
      legendOf(result, false, false).map((entry) => entry.mark),
    ).not.toContain("console");
  });
});

const REASONS = {
  rowFromFront: 7,
  rowCount: 10,
  seatsOffCentre: 0,
  inFrontBand: false,
  againstWall: false,
  tiedAtRoomResolution: true,
};

describe("the billing under the map", () => {
  it("heads it with the row counted from the front", () => {
    expect(rowOf(REASONS)).toBe("Row 7 of 10");
  });

  it("credits a centred group clear of every penalty as clear of the front and the walls", () => {
    expect(creditsOf(REASONS, 0)).toEqual([
      "On the centreline",
      "Clear of the front rows and the walls",
    ]);
  });

  it("credits each penalty on a line of its own in place of the clear line", () => {
    expect(
      creditsOf(
        {
          ...REASONS,
          seatsOffCentre: -1,
          inFrontBand: true,
          againstWall: true,
        },
        1,
      ),
    ).toEqual([
      "One seat left of centre",
      "In the front rows",
      "Against a wall",
      "Across a console",
    ]);
  });
});

describe("the lines a screen reader says in the room", () => {
  it("leaves none of them empty", () => {
    const said = [
      BACK_TO_THE_LIST,
      YOUR_SEATS_IN_THIS_ROOM,
      CLEAR_OF_THE_FRONT,
      UNCONFIRMED,
      RE_CHECKED_ON_THE_TAP,
      WAITS_FOR_THE_CONNECTION,
    ];

    expect(said.filter((line) => line.trim().length === 0)).toEqual([]);
  });
});
