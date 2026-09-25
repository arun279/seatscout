import {
  type Auditorium,
  nearestInRow,
  type PositionedSeat,
  REFERENCE,
  type SeatRow,
} from "@seatscout/client";
import { beforeAll, describe, expect, it } from "vitest";
import {
  HOOKY_ADDISON,
  type OpenedRoom,
  openedRooms,
  VILLAGE_1,
  WEST_PLANO_28,
} from "./rooms.fixtures.js";
import {
  aimedAt,
  consolesIn,
  dividersIn,
  frameOf,
  groupHolding,
  holds,
  offeredIn,
  shownIn,
  stateOf,
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
    WEST_PLANO_28,
    VILLAGE_1,
    HOOKY_ADDISON,
  ]);
});

describe("the frame the whole room is drawn in", () => {
  it("leaves a gutter of 1.6 seats on the left for the row labels and half a seat elsewhere", () => {
    const { auditorium } = openedRoom(WEST_PLANO_28);
    const seats = auditorium.map.rows.flatMap((row) => row.seats);
    const frame = frameOf(auditorium);
    const widest = Math.max(...seats.map((seat) => seat.width));

    expect(frame.seatWidth).toBe(widest);
    expect(frame.x).toBeCloseTo(
      Math.min(...seats.map((seat) => seat.x)) - 1.6 * widest,
      6,
    );
    expect(frame.y).toBeCloseTo(
      Math.min(...seats.map((seat) => seat.y)) - 0.5 * widest,
      6,
    );
    expect(frame.x + frame.width).toBeCloseTo(
      Math.max(...seats.map((seat) => seat.x + seat.width)) + 0.5 * widest,
      6,
    );
    expect(frame.y + frame.height).toBeCloseTo(
      Math.max(...seats.map((seat) => seat.y + seat.height)) + 0.5 * widest,
      6,
    );
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

describe("what a Seat is drawn as", () => {
  it("says a Seat is lit when the chosen group holds it, whatever else it is", () => {
    const { auditorium, result } = openedRoom(WEST_PLANO_28);

    for (const held of result.seats) {
      expect(holds(result, seatNamed(auditorium, held.id))).toBe(true);
      expect(stateOf(seatNamed(auditorium, held.id), true)).toBe("lit");
    }
  });

  it("separates a Seat for sale from one that is not bookable", () => {
    const { auditorium } = openedRoom(WEST_PLANO_28);
    const seats = auditorium.map.rows.flatMap((row) => row.seats);
    const free = seats.find((seat) => seat.bookable);
    const gone = seats.find((seat) => !seat.bookable);
    if (free === undefined || gone === undefined)
      throw new Error("the room has only one kind of Seat");

    expect(stateOf(free, false)).toBe("bookable");
    expect(stateOf(gone, false)).toBe("unbookable");
  });

  it("does not hold a Seat the group never took", () => {
    const { auditorium, result } = openedRoom(WEST_PLANO_28);
    const outside = auditorium.map.rows
      .flatMap((row) => row.seats)
      .find((seat) => !result.seats.some((held) => held.id === seat.id));
    if (outside === undefined) throw new Error("the room is one group wide");

    expect(holds(result, outside)).toBe(false);
  });
});

describe("which Seats a person may choose from the map", () => {
  it("names every Seat any offered group holds, and no other", () => {
    const { auditorium } = openedRoom(WEST_PLANO_28);
    const offered = offeredIn(auditorium);

    expect(offered.size).toBe(
      new Set(
        auditorium.offered.flatMap((group) =>
          group.seats.map((seat) => seat.id),
        ),
      ).size,
    );
    for (const group of auditorium.offered)
      for (const seat of group.seats) expect(offered.has(seat.id)).toBe(true);
  });

  it("finds the group a Seat belongs to, and nothing for a Seat no group offers", () => {
    const { auditorium, result } = openedRoom(WEST_PLANO_28);
    const offered = offeredIn(auditorium);
    const unoffered = auditorium.map.rows
      .flatMap((row) => row.seats)
      .find((seat) => !offered.has(seat.id));
    if (unoffered === undefined) throw new Error("every Seat is offered");

    expect(
      result.seats.map(
        (held) => groupHolding(auditorium, seatNamed(auditorium, held.id))?.key,
      ),
    ).toEqual(result.seats.map(() => result.key));
    expect(groupHolding(auditorium, unoffered)).toBeUndefined();
  });
});

describe("where the Seat Profile aims in the room", () => {
  it("rings the Seat nearest the depth and the lateral the profile asks for", () => {
    const { auditorium, result } = openedRoom(WEST_PLANO_28);
    const profile = result.terms.profile ?? REFERENCE;
    const row = auditorium.map.rows.reduce((nearest, held) =>
      Math.abs(held.depth - profile.targetDepth) <
      Math.abs(nearest.depth - profile.targetDepth)
        ? held
        : nearest,
    );
    const seat = nearestInRow(row, profile.targetLateral);

    expect(aimedAt(result, auditorium.map)).toEqual({
      x: seat.x,
      y: seat.y,
      width: seat.width,
      height: seat.height,
    });
  });

  it("aims at the room the profile names rather than at the group that was chosen", () => {
    const { auditorium, result } = openedRoom(WEST_PLANO_28);
    const lower = { ...(result.terms.profile ?? REFERENCE), targetDepth: 0 };
    const deeper = { ...lower, targetDepth: 1 };

    expect(
      aimedAt(
        { ...result, terms: { ...result.terms, profile: lower } },
        auditorium.map,
      ).y,
    ).toBeLessThan(
      aimedAt(
        { ...result, terms: { ...result.terms, profile: deeper } },
        auditorium.map,
      ).y,
    );
  });
});

describe("the alternates the room lists", () => {
  it("opens with the recommendation and at most three others, the recommendation first", () => {
    const { auditorium, result } = openedRoom(HOOKY_ADDISON);
    const listed = shownIn(auditorium, result, result);

    expect(auditorium.offered.length).toBeGreaterThan(4);
    expect(listed).toHaveLength(4);
    expect(listed.at(0)?.key).toBe(result.key);
    expect(new Set(listed.map((group) => group.key)).size).toBe(4);
  });

  it("adds the chosen group when the choice is one the first four do not hold", () => {
    const { auditorium, result } = openedRoom(HOOKY_ADDISON);
    const opening = shownIn(auditorium, result, result);
    const elsewhere = auditorium.offered.find(
      (group) => !opening.some((shown) => shown.key === group.key),
    );
    if (elsewhere === undefined) throw new Error("every group was listed");

    const listed = shownIn(auditorium, result, elsewhere);

    expect(listed).toHaveLength(5);
    expect(listed.at(-1)?.key).toBe(elsewhere.key);
  });

  it("lists a room that offers fewer than four without padding it", () => {
    const { auditorium, result } = openedRoom(VILLAGE_1);
    const listed = shownIn(auditorium, result, result);

    expect(listed.length).toBe(Math.min(4, auditorium.offered.length));
  });
});

describe("the console dividers a row carries", () => {
  it("draws a tick midway across every pod gap, down the middle of the Seats beside it", () => {
    const { auditorium } = openedRoom(HOOKY_ADDISON);
    const row = auditorium.map.rows.find((held) =>
      held.gapAfter.includes("pod"),
    );
    if (row === undefined) throw new Error("no row has a console");
    const at = row.gapAfter.indexOf("pod");
    const left = row.seats.at(at);
    const right = row.seats.at(at + 1);
    if (left === undefined || right === undefined)
      throw new Error("the pod gap has no Seats beside it");

    expect(dividersIn(row)).toContainEqual({
      x: (left.x + left.width + right.x) / 2,
      y1: left.y + 0.2 * left.height,
      y2: left.y + 0.8 * left.height,
    });
    expect(dividersIn(row)).toHaveLength(
      row.gapAfter.filter((gap) => gap === "pod").length,
    );
  });

  it("draws none in a row whose Seats only meet or part at an aisle", () => {
    const { auditorium } = openedRoom(WEST_PLANO_28);
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
    expect(consolesIn(openedRoom(HOOKY_ADDISON).auditorium.map)).toBe(true);
    expect(consolesIn(openedRoom(WEST_PLANO_28).auditorium.map)).toBe(false);
  });
});
