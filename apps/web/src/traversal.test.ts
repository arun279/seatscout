import type { Auditorium } from "@seatscout/client";
import { beforeAll, describe, expect, it } from "vitest";
import {
  ANGELIKA_5,
  FIVE_ROOMS,
  LAKE_HIGHLANDS_1,
  labelAt,
  type OpenedRoom,
  openedRooms,
  STRIKE_AND_REEL_1,
  VILLAGE_1,
  WEST_PLANO_28,
} from "./rooms.fixtures.js";
import {
  type Cursor,
  isMove,
  type Move,
  moved,
  opened,
  placed,
} from "./traversal.js";

let rooms: readonly OpenedRoom[] = [];

const auditoriumOf = (wanted: { readonly showtime: number }): Auditorium => {
  const found = rooms.find((room) => room.room.showtime === wanted.showtime);
  if (found === undefined) throw new Error("the room was not opened");
  return found.auditorium;
};

const walked = (
  auditorium: Auditorium,
  from: Cursor,
  keys: readonly (Move | `Ctrl+${Move}`)[],
) =>
  keys.reduce<Cursor>((cursor, key) => {
    const ctrl = key.startsWith("Ctrl+");
    const move = ctrl ? key.slice(5) : key;
    if (!isMove(move)) throw new Error(`${key} is not a move`);
    return moved(auditorium.map, cursor, move, ctrl);
  }, from);

const labelsAfter = (
  wanted: { readonly showtime: number },
  keys: readonly (Move | `Ctrl+${Move}`)[],
) => {
  const auditorium = auditoriumOf(wanted);
  return labelAt(auditorium, walked(auditorium, opened(auditorium), keys));
};

const everyPlace = (auditorium: Auditorium) =>
  auditorium.map.rows.flatMap((row, rowAt) =>
    row.seats.map((_, seatAt) => ({ row: rowAt, seat: seatAt })),
  );

beforeAll(async () => {
  rooms = await openedRooms();
});

describe("the keyboard model over the five captured rooms", () => {
  it("opens on the first Seat of the recommended Seat Group, anchored on its lateral", () => {
    const auditorium = auditoriumOf(WEST_PLANO_28);
    const cursor = opened(auditorium);

    expect(labelAt(auditorium, cursor)).toBe("H14");
    expect(cursor.anchor).toBe(auditorium.map.rows[7]?.seats[9]?.lateral);
  });

  it.each([
    [["ArrowRight"], "H13"],
    [["ArrowLeft"], "H15"],
    [["Home"], "H25"],
    [["End"], "H1"],
    [["Ctrl+Home"], "A21"],
    [["Ctrl+End"], "P1"],
    [["ArrowDown"], "J14"],
    [["ArrowUp"], "G14"],
    [["PageUp"], "A14"],
    [["PageDown"], "P14"],
    [["Ctrl+Home", "ArrowUp"], "A21"],
    [["Ctrl+End", "ArrowDown"], "P1"],
    [["Home", "ArrowLeft"], "H25"],
    [["End", "ArrowRight"], "H1"],
  ] as const)(
    "moves %j to %s from H14 in the 304-seat room, with no wrap at any edge",
    (keys, label) => {
      expect(labelsAfter(WEST_PLANO_28, keys)).toBe(label);
    },
  );

  it("sets the anchor sideways and reads it vertically, so a sweep across a ragged row lands where the last sideways move did", () => {
    expect(
      labelsAfter(WEST_PLANO_28, ["ArrowDown", "ArrowDown", "ArrowRight"]),
    ).toBe("K13");
    expect(
      labelsAfter(WEST_PLANO_28, [
        "ArrowDown",
        "ArrowDown",
        "ArrowRight",
        "ArrowUp",
        "ArrowUp",
      ]),
    ).toBe("H13");
    expect(
      labelsAfter(WEST_PLANO_28, [
        "End",
        "ArrowLeft",
        "ArrowLeft",
        "ArrowLeft",
        "ArrowDown",
      ]),
    ).toBe("J4");
    expect(
      labelsAfter(WEST_PLANO_28, [
        "End",
        "ArrowLeft",
        "ArrowLeft",
        "ArrowLeft",
        "ArrowDown",
        "ArrowUp",
      ]),
    ).toBe("H4");
  });

  it("crosses the accessible row and the not bookable Seats in the AMC room and comes back home", () => {
    expect(labelsAfter(VILLAGE_1, ["ArrowUp"])).toBe("F14");
    expect(labelsAfter(VILLAGE_1, ["ArrowUp", "ArrowUp"])).toBe("WC13");
    expect(
      labelsAfter(VILLAGE_1, ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown"]),
    ).toBe("G14");
  });

  it("walks the numeric room, the 46-seat room and the deepest room by the same rules", () => {
    expect(labelsAfter(LAKE_HIGHLANDS_1, [])).toBe("608");
    expect(labelsAfter(LAKE_HIGHLANDS_1, ["ArrowUp", "ArrowUp"])).toBe("406");
    expect(
      labelsAfter(LAKE_HIGHLANDS_1, ["ArrowUp", "ArrowUp", "ArrowDown"]),
    ).toBe("508");
    expect(labelsAfter(LAKE_HIGHLANDS_1, ["Ctrl+Home"])).toBe("101");
    expect(labelsAfter(LAKE_HIGHLANDS_1, ["Ctrl+End"])).toBe("919");
    expect(labelsAfter(STRIKE_AND_REEL_1, [])).toBe("D8");
    expect(labelsAfter(STRIKE_AND_REEL_1, ["ArrowUp"])).toBe("C8");
    expect(labelsAfter(STRIKE_AND_REEL_1, ["ArrowUp", "ArrowUp"])).toBe("B8");
    expect(labelsAfter(STRIKE_AND_REEL_1, ["Home"])).toBe("D11");
    expect(labelsAfter(STRIKE_AND_REEL_1, ["PageDown"])).toBe("E8");
    expect(labelsAfter(ANGELIKA_5, [])).toBe("L11");
    expect(labelsAfter(ANGELIKA_5, ["ArrowRight", "ArrowUp"])).toBe("K10");
    expect(
      labelsAfter(ANGELIKA_5, [
        "ArrowRight",
        "ArrowUp",
        "ArrowUp",
        "ArrowLeft",
        "ArrowDown",
        "ArrowDown",
      ]),
    ).toBe("L11");
  });

  it("returns to the Seat it started from after Down then Up, for every Seat outside the back row: 990 of them", () => {
    const tried = rooms.flatMap(({ auditorium }) =>
      everyPlace(auditorium)
        .filter((place) => place.row < auditorium.map.rows.length - 1)
        .map((place) => ({
          from: place,
          back: walked(auditorium, placed(auditorium.map, place), [
            "ArrowDown",
            "ArrowUp",
          ]),
        })),
    );

    expect(tried).toHaveLength(990);
    expect(
      tried.filter(
        ({ from, back }) => back.row !== from.row || back.seat !== from.seat,
      ),
    ).toEqual([]);
  });

  it("returns to the Seat it started from after Up then Down, for every Seat outside the front row: 1,001 of them", () => {
    const tried = rooms.flatMap(({ auditorium }) =>
      everyPlace(auditorium)
        .filter((place) => place.row > 0)
        .map((place) => ({
          from: place,
          back: walked(auditorium, placed(auditorium.map, place), [
            "ArrowUp",
            "ArrowDown",
          ]),
        })),
    );

    expect(tried).toHaveLength(1001);
    expect(
      tried.filter(
        ({ from, back }) => back.row !== from.row || back.seat !== from.seat,
      ),
    ).toEqual([]);
  });

  it("reaches every Seat exactly once on a row-major sweep of Right, then Down and Home, in all five rooms", () => {
    const swept = rooms.map(({ auditorium }) => {
      const visited: string[] = [];
      let cursor = walked(auditorium, opened(auditorium), ["Ctrl+Home"]);
      for (let row = 0; row < auditorium.map.rows.length; row += 1) {
        for (;;) {
          visited.push(`${cursor.row}:${cursor.seat}`);
          const next = walked(auditorium, cursor, ["ArrowRight"]);
          if (next.seat === cursor.seat) break;
          cursor = next;
        }
        cursor = walked(auditorium, cursor, ["ArrowDown", "Home"]);
      }
      return { visited, seats: auditorium.map.seatCount };
    });

    expect(swept.map((room) => room.seats)).toEqual([304, 300, 294, 155, 46]);
    for (const room of swept) {
      expect(new Set(room.visited).size).toBe(room.seats);
      expect(room.visited).toHaveLength(room.seats);
    }
  });

  it("refuses a place the room does not hold", () => {
    const auditorium = auditoriumOf(WEST_PLANO_28);

    expect(() => placed(auditorium.map, { row: 14, seat: 0 })).toThrow(
      "no row 14",
    );
    expect(() => placed(auditorium.map, { row: 0, seat: 18 })).toThrow(
      "no Seat at row 0, seat 18",
    );
  });

  it("opens every one of the five rooms on its recommended Seat Group", () => {
    expect(
      rooms.map(({ auditorium }) => labelAt(auditorium, opened(auditorium))),
    ).toEqual(["H14", "L11", "G14", "608", "D8"]);
    expect(FIVE_ROOMS).toHaveLength(5);
  });
});
