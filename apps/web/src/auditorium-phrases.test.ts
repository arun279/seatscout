import type {
  Auditorium,
  AuditoriumMap,
  PositionedSeat,
  SeatRow,
} from "@seatscout/client";
import { beforeAll, describe, expect, it } from "vitest";
import {
  chosenOf,
  gridLabelOf,
  groupsOf,
  ordinalOf,
  refusalOf,
  rowTextOf,
  seatNameOf,
} from "./auditorium-phrases.js";
import {
  ANGELIKA_5,
  LAKE_HIGHLANDS_1,
  type OpenedRoom,
  openedRooms,
  STRIKE_AND_REEL_1,
  VILLAGE_1,
  WEST_PLANO_28,
} from "./rooms.fixtures.js";

let rooms: readonly OpenedRoom[] = [];

const openedRoom = (wanted: { readonly showtime: number }): OpenedRoom => {
  const found = rooms.find((room) => room.room.showtime === wanted.showtime);
  if (found === undefined) throw new Error("the room was not opened");
  return found;
};

const seatNamed = (auditorium: Auditorium, id: string): PositionedSeat => {
  const seat = auditorium.map.rows
    .flatMap((row) => row.seats)
    .find((found) => found.id === id);
  if (seat === undefined) throw new Error(`${id} is not in the room`);
  return seat;
};

const rowOf = (map: AuditoriumMap, at: number): SeatRow => {
  const row = map.rows[at];
  if (row === undefined) throw new Error(`no row ${at}`);
  return row;
};

const nameOf = (opened: OpenedRoom, id: string, accessibleSeating = false) =>
  seatNameOf(
    seatNamed(opened.auditorium, id),
    opened.result.seats.map((seat) => seat.id),
    accessibleSeating,
  );

beforeAll(async () => {
  rooms = await openedRooms();
});

describe("what the room calls things", () => {
  it("counts rows the way a person does", () => {
    expect(
      [1, 2, 3, 4, 11, 12, 13, 14, 21, 22, 23, 101, 111].map(ordinalOf),
    ).toEqual([
      "1st",
      "2nd",
      "3rd",
      "4th",
      "11th",
      "12th",
      "13th",
      "14th",
      "21st",
      "22nd",
      "23rd",
      "101st",
      "111th",
    ]);
  });

  it("names a Seat as its label, its lateral, its availability, its kind and its place in the recommendation, in D45's pattern", () => {
    expect(nameOf(openedRoom(ANGELIKA_5), "L11")).toBe(
      "Seat L11. On the centreline. Bookable. First of your two recommended seats.",
    );
    expect(nameOf(openedRoom(ANGELIKA_5), "L10")).toBe(
      "Seat L10. One and a half seats right of centre. Bookable. Second of your two recommended seats.",
    );
    expect(nameOf(openedRoom(WEST_PLANO_28), "A21")).toBe(
      "Seat A21. Eight and a half seats left of centre. Not bookable.",
    );
    expect(nameOf(openedRoom(LAKE_HIGHLANDS_1), "607")).toBe(
      "Seat 607. On the centreline. Bookable.",
    );
    expect(nameOf(openedRoom(LAKE_HIGHLANDS_1), "608")).toBe(
      "Seat 608. One seat right of centre. Bookable. First of your two recommended seats.",
    );
  });

  it("names a wheelchair space and a companion seat by kind, and says they are kept out of ordinary results unless the Query asked for them", () => {
    expect(nameOf(openedRoom(VILLAGE_1), "WC17")).toBe(
      "Seat WC17. Seven and a half seats left of centre. Wheelchair space. Bookable, and kept out of ordinary results.",
    );
    expect(nameOf(openedRoom(VILLAGE_1), "E18")).toBe(
      "Seat E18. Nine and a half seats left of centre. Companion seat. Bookable, and kept out of ordinary results.",
    );
    expect(nameOf(openedRoom(VILLAGE_1), "WC17", true)).toBe(
      "Seat WC17. Seven and a half seats left of centre. Wheelchair space. Bookable.",
    );
    expect(nameOf(openedRoom(STRIKE_AND_REEL_1), "D11")).toBe(
      "Seat D11. Six seats left of centre. Not bookable.",
    );
  });

  it("describes a Row for the row bar: its ordinal of the count, its seats, how many are bookable and how many are accessible spaces", () => {
    const { map } = openedRoom(WEST_PLANO_28).auditorium;
    const village = openedRoom(VILLAGE_1).auditorium.map;
    const angelika = openedRoom(ANGELIKA_5).auditorium.map;

    expect(rowTextOf(rowOf(map, 7), map)).toBe(
      "8th row of 14 from the front. 20 seats, 12 bookable.",
    );
    expect(rowTextOf(rowOf(map, 0), map)).toBe(
      "1st row of 14 from the front. 18 seats, none bookable.",
    );
    expect(rowTextOf(rowOf(angelika, 10), angelika)).toBe(
      "11th row of 15 from the front. 20 seats, all 20 bookable.",
    );
    expect(rowTextOf(rowOf(village, 4), village)).toBe(
      "5th row of 10 from the front. 23 seats, 21 bookable, 11 of them wheelchair or companion spaces.",
    );
  });

  it("labels the grid with the room, its size and the recommendation, so the recommendation is spoken on entry", () => {
    const opened = openedRoom(WEST_PLANO_28);

    expect(gridLabelOf(opened.auditorium, opened.result)).toBe(
      "Seat map of Cinemark Frisco Square and XD at 10:10p. 304 seats in 14 rows, 25 bookable. Recommended: H14 and H13, 8th row of 14, on the centreline. Arrow keys move one seat.",
    );
  });

  it("names the reason a Seat cannot start a Seat Group", () => {
    const plano = openedRoom(WEST_PLANO_28).auditorium;
    const village = openedRoom(VILLAGE_1).auditorium;

    expect(refusalOf(seatNamed(plano, "A21"), 2, false)).toBe(
      "Seat A21 is not bookable, so no seats together can include it.",
    );
    expect(refusalOf(seatNamed(village, "WC17"), 2, false)).toBe(
      "Seat WC17 is a wheelchair space. Ask for accessible seating in the query to include it.",
    );
    expect(refusalOf(seatNamed(village, "E18"), 2, false)).toBe(
      "Seat E18 is a companion seat. Ask for accessible seating in the query to include it.",
    );
    expect(refusalOf(seatNamed(plano, "J10"), 2, false)).toBe(
      "No offered pair includes seat J10.",
    );
    expect(refusalOf(seatNamed(village, "WC17"), 3, true)).toBe(
      "No offered three includes seat WC17.",
    );
  });

  it("says what was chosen and what happens to it", () => {
    const { result } = openedRoom(VILLAGE_1);

    expect(chosenOf(result)).toBe(
      "G14 and G13 chosen. They are re-checked when you continue.",
    );
    expect(chosenOf({ ...result, seats: result.seats.slice(0, 1) })).toBe(
      "G14 chosen. It is re-checked when you continue.",
    );
  });

  it("counts the Seat Groups a room holds in the party's own word", () => {
    expect(groupsOf(131, 2)).toBe("131 pairs in this room.");
    expect(groupsOf(1, 2)).toBe("The only pair in this room.");
    expect(groupsOf(85, 3)).toBe("85 threes in this room.");
    expect(groupsOf(1, 3)).toBe("The only three in this room.");
    expect(groupsOf(12, 1)).toBe("12 seats in this room.");
    expect(groupsOf(1, 1)).toBe("The only seat in this room.");
  });
});
