import type { Auditorium, PositionedSeat, SeatRow } from "@seatscout/client";
import { beforeAll, describe, expect, it } from "vitest";
import {
  HOOKY_SOUTHLAKE,
  type OpenedRoom,
  openedRooms,
  VILLAGE_1,
  WEST_PLANO_10,
} from "./rooms.fixtures.js";
import {
  consolesIn,
  dividersIn,
  everyGroupIn,
  frameOf,
  groupHolding,
  holds,
} from "./seat-map.js";

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

const rowHolding = (auditorium: Auditorium, id: string): SeatRow => {
  const row = auditorium.map.rows.find((held) =>
    held.seats.some((seat) => seat.id === id),
  );
  if (row === undefined) throw new Error(`no row holds ${id}`);
  return row;
};

beforeAll(async () => {
  rooms = await openedRooms(undefined, [
    WEST_PLANO_10,
    VILLAGE_1,
    HOOKY_SOUTHLAKE,
  ]);
});

describe("the frame the whole room is drawn in", () => {
  it("leaves a gutter of 1.6 seats on the left for the row labels and half a seat elsewhere", () => {
    const { auditorium } = openedRoom(WEST_PLANO_10);

    expect(frameOf(auditorium)).toEqual({
      x: expect.closeTo(-28.8, 6),
      y: expect.closeTo(-9, 6),
      width: expect.closeTo(555.8, 6),
      height: expect.closeTo(336, 6),
      seatWidth: 18,
    });
  });

  it("takes its scale from the widest Seat in the room", () => {
    const { auditorium } = openedRoom(WEST_PLANO_10);
    const [first, ...rest] = auditorium.map.rows;
    const [seat, ...others] = first?.seats ?? [];
    if (first === undefined || seat === undefined)
      throw new Error("the room has no Seats");
    const wide = {
      ...auditorium,
      map: {
        ...auditorium.map,
        rows: [
          { ...first, seats: [{ ...seat, width: seat.width * 3 }, ...others] },
          ...rest,
        ],
      },
    };

    expect(frameOf(wide).seatWidth).toBe(seat.width * 3);
  });

  it("holds every Seat in the room inside itself", () => {
    for (const { auditorium } of rooms) {
      const frame = frameOf(auditorium);

      for (const row of auditorium.map.rows)
        for (const seat of row.seats) {
          expect(seat.x).toBeGreaterThanOrEqual(frame.x);
          expect(seat.y).toBeGreaterThanOrEqual(frame.y);
          expect(seat.x + seat.width).toBeLessThanOrEqual(
            frame.x + frame.width,
          );
          expect(seat.y + seat.height).toBeLessThanOrEqual(
            frame.y + frame.height,
          );
        }
    }
  });
});

describe("the Seats a group holds", () => {
  it("holds every Seat the group took", () => {
    const { auditorium, result } = openedRoom(WEST_PLANO_10);

    for (const held of result.seats)
      expect(holds(result, seatNamed(auditorium, held.id))).toBe(true);
  });

  it("does not hold a Seat the group never took", () => {
    const { auditorium, result } = openedRoom(WEST_PLANO_10);
    const outside = auditorium.map.rows
      .flatMap((row) => row.seats)
      .find((seat) => !result.seats.some((held) => held.id === seat.id));
    if (outside === undefined) throw new Error("the room is one group wide");

    expect(holds(result, outside)).toBe(false);
  });
});

describe("which Seats a person may choose from the map", () => {
  it("finds the group a Seat belongs to, and nothing for a Seat no group offers", () => {
    const { auditorium, result } = openedRoom(WEST_PLANO_10);
    const unoffered = auditorium.map.rows
      .flatMap((row) => row.seats)
      .find(
        (seat) => !auditorium.offered.some(({ group }) => holds(group, seat)),
      );
    if (unoffered === undefined) throw new Error("every Seat is offered");

    expect(
      result.seats.map(
        (held) =>
          groupHolding(auditorium, seatNamed(auditorium, held.id))?.group.key,
      ),
    ).toEqual(result.seats.map(() => result.key));
    expect(groupHolding(auditorium, unoffered)).toBeUndefined();
  });
});

describe("every Seat Group the phone's room lists", () => {
  it("lists the recommendation first and then every other group the room offers, each once", () => {
    const { auditorium, result } = openedRoom(HOOKY_SOUTHLAKE);
    const listed = everyGroupIn(auditorium);

    expect(listed).toHaveLength(31);
    expect(listed.at(0)?.group.key).toBe(result.key);
    expect(new Set(listed.map(({ group }) => group.key)).size).toBe(31);
  });
});

describe("the console dividers a row carries", () => {
  it("draws no tick where a row claims a pod gap past its own last Seat", () => {
    const { auditorium } = openedRoom(VILLAGE_1);
    const [row] = auditorium.map.rows;
    if (row === undefined) throw new Error("the room has no rows");

    expect(
      dividersIn({ ...row, gapAfter: [...row.gapAfter, "pod", "pod"] }),
    ).toEqual(dividersIn(row));
  });

  it("draws a tick midway across every pod gap, down the middle of the Seats beside it", () => {
    const { auditorium } = openedRoom(HOOKY_SOUTHLAKE);
    const row = auditorium.map.rows.find((held) =>
      held.gapAfter.includes("pod"),
    );
    if (row === undefined) throw new Error("no row has a console");

    expect(row.label).toBe("E");
    expect(dividersIn(row).map((divider) => divider.x)).toEqual(
      [128.6, 230.8, 494, 596.15, 698.35, 800.55, 1067.4, 1169.6].map((x) =>
        expect.closeTo(x, 6),
      ),
    );
    expect(dividersIn(row)[0]).toMatchObject({
      y1: expect.closeTo(388.64, 6),
      y2: expect.closeTo(408.56, 6),
    });
  });

  it("draws none in a row whose Seats only meet or part at an aisle", () => {
    const { auditorium } = openedRoom(WEST_PLANO_10);
    const row = auditorium.map.rows.find(
      (held) => !held.gapAfter.includes("pod"),
    );
    if (row === undefined) throw new Error("every row has a console");

    expect(dividersIn(row)).toEqual([]);
    expect(
      row.seats.flatMap((held) => dividersIn(rowHolding(auditorium, held.id))),
    ).toEqual([]);
  });

  it("says whether the room has any console at all, which is what the legend asks", () => {
    expect(consolesIn(openedRoom(HOOKY_SOUTHLAKE).auditorium.map)).toBe(true);
    expect(consolesIn(openedRoom(WEST_PLANO_10).auditorium.map)).toBe(false);
  });
});
