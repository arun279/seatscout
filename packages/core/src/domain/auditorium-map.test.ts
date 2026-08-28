import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { seatMapCaptures } from "../corpus/captures.js";
import type { CapturedSeatMap } from "../corpus/types.js";
import { type Seat, seatsFrom } from "../source/seat-map.js";
import {
  type PositionedSeat,
  type SeatRow,
  auditoriumMap,
  nearestInRow,
} from "./auditorium-map.js";
import { seatGroupsIn } from "./seat-group.js";

interface Space {
  readonly away: number;
  readonly width: number;
  readonly accessible: boolean;
  readonly bookable: boolean;
}

interface Row {
  readonly gap: number;
  readonly origin: number;
  readonly spaces: readonly Space[];
}

const FETCHED_AT = 1000;
const ROOM_WHOSE_ROW_INDEX_SKIPS_TWO = "561865199";
const ROOM_WHOSE_ROW_LETTERS_SKIP_ONE = "561462741";
const ROOM_NUMBERED_WITHOUT_LETTERS = "561609773";

const seatAt = (id: string, x: number, y: number, space: Space): Seat => ({
  id,
  designation: space.accessible ? "wheelchair" : "standard",
  bookable: space.bookable,
  x,
  y,
  width: space.width,
  height: space.width,
  leftNeighbour: null,
  rightNeighbour: null,
  provenance: {
    source: "aggregator",
    fetchedAt: FETCHED_AT,
    upstreamStatus: space.bookable ? "A" : "R",
  },
});

const yOf = (rows: readonly Row[], row: number) =>
  rows.slice(1, row + 1).reduce((total, ahead) => total + ahead.gap, 0);

const centreOf = (row: Row, seat: number) =>
  row.spaces
    .slice(1, seat + 1)
    .reduce((total, space) => total + space.away, row.origin);

const numbered = (rows: readonly Row[], row: number, seat: number) =>
  rows
    .slice(0, row)
    .reduce((total, ahead) => total + ahead.spaces.length, seat);

const lyingLabel = (
  rows: readonly Row[],
  row: number,
  seat: number,
  accessible: boolean,
) =>
  `${accessible ? "WC" : String.fromCharCode(65 + rows.length - 1 - row)}${999 - numbered(rows, row, seat)}`;

const drawn = (rows: readonly Row[]): Seat[] =>
  rows.flatMap((row, index) =>
    row.spaces.map((space, seat) =>
      seatAt(
        lyingLabel(rows, index, seat, space.accessible),
        centreOf(row, seat) - space.width / 2,
        yOf(rows, index),
        space,
      ),
    ),
  );

const spaceOf = fc.record({
  away: fc.integer({ min: 1, max: 44 }),
  width: fc.integer({ min: 1, max: 20 }),
  accessible: fc.oneof(
    { weight: 4, arbitrary: fc.constant(false) },
    { weight: 1, arbitrary: fc.constant(true) },
  ),
  bookable: fc.boolean(),
});

const rowOf = fc.record({
  gap: fc.integer({ min: 1, max: 40 }),
  origin: fc.integer({ min: -60, max: 60 }),
  spaces: fc.array(spaceOf, { minLength: 1, maxLength: 12 }),
});

const loneSeatRow = rowOf.map((row) => ({
  ...row,
  spaces: row.spaces.slice(0, 1),
}));

const layouts = fc.oneof(
  {
    weight: 1,
    arbitrary: fc.array(loneSeatRow, { minLength: 1, maxLength: 1 }),
  },
  { weight: 1, arbitrary: fc.array(rowOf, { minLength: 1, maxLength: 1 }) },
  {
    weight: 1,
    arbitrary: fc.array(loneSeatRow, { minLength: 2, maxLength: 6 }),
  },
  { weight: 6, arbitrary: fc.array(rowOf, { minLength: 2, maxLength: 9 }) },
);

const auditoriums = layouts.map(drawn).chain((seats) =>
  fc.shuffledSubarray(seats, {
    minLength: seats.length,
    maxLength: seats.length,
  }),
);

const ascending = (values: readonly number[]) =>
  [...new Set(values)].sort((first, second) => first - second);

const capturedRooms = () =>
  [...seatMapCaptures.values()].map((capture) => capture.body);

const seatsOf = (body: CapturedSeatMap) => {
  const seats = seatsFrom(JSON.stringify(body), FETCHED_AT);
  if (seats === null)
    throw new Error(
      `the corpus seat map for showtime ${body.showtimeId} does not read`,
    );
  return seats;
};

const capturedRoom = (showtime: string) => {
  const body = capturedRooms().find((room) => room.showtimeId === showtime);
  if (body === undefined)
    throw new Error(`the corpus holds no seat map for showtime ${showtime}`);
  return body;
};

const accessibleLabel = (seat: Seat) => seat.id.startsWith("WC");

const lateralsOf = (seats: readonly PositionedSeat[]) =>
  seats.map((seat) => seat.lateral);

describe("the Auditorium map the keyboard walks", () => {
  it("reaches every Seat exactly once, in rows from the front", () => {
    const shapes = { oneRow: 0, oneSeat: 0, oneSeatPerRow: 0, ragged: 0 };

    fc.assert(
      fc.property(auditoriums, (seats) => {
        const map = auditoriumMap(seats, []);
        const widths = new Set(map.rows.map((row) => row.seats.length));

        if (map.rows.length === 1) shapes.oneRow += 1;
        if (seats.length === 1) shapes.oneSeat += 1;
        if (map.rows.length > 1 && widths.size === 1 && widths.has(1))
          shapes.oneSeatPerRow += 1;
        if (widths.size > 1) shapes.ragged += 1;

        expect(
          map.rows
            .flatMap((row) => row.seats)
            .map((seat) => seat.id)
            .toSorted(),
        ).toEqual(seats.map((seat) => seat.id).toSorted());
        expect(map.seatCount).toBe(seats.length);
      }),
      { numRuns: 300 },
    );

    expect(shapes.oneRow).toBeGreaterThan(0);
    expect(shapes.oneSeat).toBeGreaterThan(0);
    expect(shapes.oneSeatPerRow).toBeGreaterThan(0);
    expect(shapes.ragged).toBeGreaterThan(0);
  });

  it("numbers the rows from one at the front, with no gaps", () => {
    fc.assert(
      fc.property(auditoriums, (seats) => {
        const map = auditoriumMap(seats, []);
        const drawnAt = ascending(seats.map((seat) => seat.y));

        expect(map.rows.map((row) => row.ordinalFromFront)).toEqual(
          map.rows.map(
            (row) =>
              1 +
              drawnAt.filter(
                (y) => y < Math.min(...row.seats.map((seat) => seat.y)),
              ).length,
          ),
        );
        expect(map.rows.map((row) => row.ordinalFromFront)).toEqual(
          drawnAt.map((_, index) => index + 1),
        );
        expect(map.rows.map((row) => row.depth)).toEqual(
          ascending(map.rows.map((row) => row.depth)),
        );
      }),
      { numRuns: 300 },
    );
  });

  it("orders every row left to right, with no two Seats at one lateral", () => {
    const shapes = { leftEdgesDisagree: 0 };

    fc.assert(
      fc.property(auditoriums, (seats) => {
        const map = auditoriumMap(seats, []);

        for (const row of map.rows)
          if (
            row.seats.map((seat) => seat.x).toString() !==
            ascending(row.seats.map((seat) => seat.x)).toString()
          )
            shapes.leftEdgesDisagree += 1;

        expect(map.rows.map((row) => lateralsOf(row.seats))).toEqual(
          map.rows.map((row) => ascending(lateralsOf(row.seats))),
        );
      }),
      { numRuns: 300 },
    );

    expect(shapes.leftEdgesDisagree).toBeGreaterThan(0);
  });

  it("answers a Seat's own lateral with that Seat, so Down then Up returns home", () => {
    fc.assert(
      fc.property(auditoriums, (seats) => {
        const map = auditoriumMap(seats, []);

        expect(
          map.rows.map((row) =>
            row.seats.map((seat) => nearestInRow(row, seat.lateral)),
          ),
        ).toEqual(map.rows.map((row) => [...row.seats.keys()]));
      }),
      { numRuns: 300 },
    );
  });

  it("answers an anchor with the nearest Seat in the row", () => {
    fc.assert(
      fc.property(
        auditoriums,
        fc.double({ min: -2, max: 2, noNaN: true }),
        (seats, anchor) => {
          const map = auditoriumMap(seats, []);
          const away = (row: SeatRow) =>
            row.seats.map((seat) => Math.abs(seat.lateral - anchor));

          expect(map.rows.map((row) => nearestInRow(row, anchor))).toEqual(
            map.rows.map((row) => away(row).indexOf(Math.min(...away(row)))),
          );
        },
      ),
      { numRuns: 300 },
    );
  });

  it("takes the Seat on the left when two are equally near the anchor", () => {
    const space = { away: 10, width: 10, accessible: false, bookable: true };
    const map = auditoriumMap(
      drawn([{ gap: 1, origin: 0, spaces: [space, space, space] }]),
      [],
    );

    expect(map.rows.map((row) => lateralsOf(row.seats))).toEqual([[-1, 0, 1]]);
    expect(map.rows.map((row) => nearestInRow(row, -0.5))).toEqual([0]);
    expect(map.rows.map((row) => nearestInRow(row, 0.5))).toEqual([1]);
  });

  it("orders the same however the Seats are labelled", () => {
    fc.assert(
      fc.property(auditoriums, fc.func(fc.string()), (seats, label) => {
        const placesOf = (room: readonly Seat[]) =>
          auditoriumMap(room, []).rows.map((row) =>
            row.seats.map((seat) => `${seat.x}|${seat.y}`),
          );

        expect(
          placesOf(seats.map((seat, index) => ({ ...seat, id: label(index) }))),
        ).toEqual(placesOf(seats));
      }),
      { numRuns: 300 },
    );
  });

  it("labels a row with the letter it was drawn under, and leaves a row of mixed prefixes unlabelled", () => {
    const shapes = { lettered: 0, mixed: 0, accessible: 0 };

    fc.assert(
      fc.property(auditoriums, (seats) => {
        const rows = auditoriumMap(seats, []).rows;

        for (const row of rows)
          if (row.seats.every(accessibleLabel)) shapes.accessible += 1;
          else if (row.seats.some(accessibleLabel)) shapes.mixed += 1;
          else shapes.lettered += 1;

        expect(rows.map((row) => row.label)).toEqual(
          rows.map((row, index) => {
            if (row.seats.every(accessibleLabel)) return "W";
            if (row.seats.some(accessibleLabel)) return null;
            return String.fromCharCode(65 + rows.length - 1 - index);
          }),
        );
      }),
      { numRuns: 300 },
    );

    expect(shapes.lettered).toBeGreaterThan(0);
    expect(shapes.mixed).toBeGreaterThan(0);
    expect(shapes.accessible).toBeGreaterThan(0);
  });

  it("reads every captured Auditorium into contiguous rows of ordered Seats", () => {
    const rooms = capturedRooms().map((body) => ({
      seats: seatsOf(body),
      map: auditoriumMap(seatsOf(body), []),
    }));

    expect(rooms).toHaveLength(42);
    expect(rooms.map((room) => room.map.rows.length)).toEqual(
      rooms.map((room) => new Set(room.seats.map((seat) => seat.y)).size),
    );
    expect(
      rooms.map((room) => room.map.rows.map((row) => row.ordinalFromFront)),
    ).toEqual(rooms.map((room) => room.map.rows.map((_, index) => index + 1)));
    expect(
      rooms.map((room) =>
        room.map.rows
          .flatMap((row) => row.seats)
          .map((seat) => seat.id)
          .toSorted(),
      ),
    ).toEqual(
      rooms.map((room) => room.seats.map((seat) => seat.id).toSorted()),
    );
    expect(
      rooms.map((room) => room.map.rows.map((row) => lateralsOf(row.seats))),
    ).toEqual(
      rooms.map((room) =>
        room.map.rows.map((row) => ascending(lateralsOf(row.seats))),
      ),
    );
  });

  it("numbers fourteen rows one to fourteen where the payload's own row index runs to sixteen", () => {
    const body = capturedRoom(ROOM_WHOSE_ROW_INDEX_SKIPS_TWO);
    const map = auditoriumMap(seatsOf(body), []);

    expect(Math.max(...body.seats.map((seat) => seat.row))).toBe(16);
    expect(map.rows.map((row) => row.ordinalFromFront)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
    ]);
    expect(map.rows.map((row) => row.label)).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "J",
      "K",
      "L",
      "M",
      "N",
      "P",
    ]);
  });

  it("leaves the six captured rows that agree on no prefix unlabelled", () => {
    const rows = capturedRooms().flatMap(
      (body) => auditoriumMap(seatsOf(body), []).rows,
    );
    const unlabelled = rows.filter((row) => row.label === null);

    expect(rows).toHaveLength(376);
    expect(
      unlabelled
        .map((row) =>
          [
            ...new Set(row.seats.map((seat) => seat.id.replace(/\d+$/, ""))),
          ].toSorted(),
        )
        .toSorted((left, right) => left.join().localeCompare(right.join())),
    ).toEqual([
      ["B", "WC"],
      ["C", "WC"],
      ["D", "WC"],
      ["E", "WC"],
      ["J", "WC"],
      ["M", "WC"],
    ]);
  });

  it("tells every row of a captured Auditorium apart by its label", () => {
    const labelled = capturedRooms().map((body) =>
      auditoriumMap(seatsOf(body), [])
        .rows.map((row) => row.label)
        .filter((label) => label !== null),
    );

    expect(labelled.map((room) => new Set(room).size)).toEqual(
      labelled.map((room) => room.length),
    );
    expect(labelled.flat()).toHaveLength(370);
  });

  it("labels a room that skips a row letter, and one numbered without letters at all", () => {
    const skipping = auditoriumMap(
      seatsOf(capturedRoom(ROOM_WHOSE_ROW_LETTERS_SKIP_ONE)),
      [],
    );
    const numberedRoom = auditoriumMap(
      seatsOf(capturedRoom(ROOM_NUMBERED_WITHOUT_LETTERS)),
      [],
    );

    expect(skipping.rows.map((row) => row.label)).toEqual([
      "A",
      "B",
      "C",
      "D",
      null,
      "F",
      "G",
      "H",
      "J",
      "K",
    ]);
    expect(numberedRoom.rows.map((row) => row.label)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
    ]);
  });

  it("records the gap after each Seat, in the three bands the corpus draws", () => {
    const rooms = capturedRooms().map((body) =>
      auditoriumMap(seatsOf(body), []),
    );
    const gaps = rooms.flatMap((map) =>
      map.rows.flatMap((row) => row.gapAfter),
    );

    expect(gaps).toHaveLength(6395);
    expect(gaps.length).toBe(
      rooms.reduce((total, map) => total + map.seatCount - map.rows.length, 0),
    );
    expect({
      contiguous: gaps.filter((gap) => gap === null).length,
      pods: gaps.filter((gap) => gap === "pod").length,
      aisles: gaps.filter((gap) => gap === "aisle").length,
    }).toEqual({ contiguous: 5766, pods: 462, aisles: 167 });
  });

  it("locates the recommended Seat Group where its Seats are drawn", () => {
    const located = capturedRooms().flatMap((body) => {
      const seats = seatsOf(body);
      return seatGroupsIn(seats, { partySize: 3, accessibleSeating: false })
        .slice(0, 1)
        .map((group) => {
          const map = auditoriumMap(seats, group.seats);
          return {
            row: map.recommended.row,
            found: map.rows
              .filter((_, index) => index === map.recommended.row)
              .flatMap((row) =>
                row.seats.filter((_, index) =>
                  map.recommended.seats.includes(index),
                ),
              )
              .map((seat) => seat.id),
            wanted: group.seats.map((seat) => seat.id),
          };
        });
    });

    expect(located).toHaveLength(42);
    expect(located.map((entry) => entry.found)).toEqual(
      located.map((entry) => entry.wanted),
    );
    expect(new Set(located.map((entry) => entry.row)).size).toBeGreaterThan(1);
  });

  it("recommends nothing when the Seat Group is not in this Auditorium", () => {
    const map = auditoriumMap(
      seatsOf(capturedRoom(ROOM_WHOSE_ROW_LETTERS_SKIP_ONE)),
      [],
    );

    expect(map.rows.length).toBeGreaterThan(1);
    expect(map.recommended).toEqual({ row: 0, seats: [] });
  });

  it("counts the bookable Seats of the room and of every row", () => {
    const rooms = capturedRooms().map((body) =>
      auditoriumMap(seatsOf(body), []),
    );
    const skipping = auditoriumMap(
      seatsOf(capturedRoom(ROOM_WHOSE_ROW_INDEX_SKIPS_TWO)),
      [],
    );

    expect(skipping.seatCount).toBe(304);
    expect(skipping.bookableCount).toBe(25);
    expect(rooms.map((map) => map.bookableCount)).toEqual(
      rooms.map((map) =>
        map.rows.reduce((total, row) => total + row.bookableCount, 0),
      ),
    );
  });
});
