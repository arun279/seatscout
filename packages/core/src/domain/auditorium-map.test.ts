import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { Seat } from "../source/seat-map.js";
import {
  FETCHED_AT,
  ascending,
  lateralsOf,
} from "./auditorium-map.fixtures.js";
import { auditoriumMap, nearestInRow } from "./auditorium-map.js";

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

const accessibleLabel = (seat: Seat) => seat.id.startsWith("WC");

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
            row.seats
              .slice(0, 1)
              .some(
                (seat) =>
                  seat.x !== Math.min(...row.seats.map((other) => other.x)),
              )
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
        const placesOf = (auditorium: readonly Seat[]) =>
          auditoriumMap(auditorium, []).rows.map((row) =>
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

  it("measures a gap by where two Seats sit, not by how wide the next one is", () => {
    const seatOf = (away: number, width: number) => ({
      away,
      width,
      accessible: false,
      bookable: true,
    });
    const map = auditoriumMap(
      drawn([
        {
          gap: 1,
          origin: 0,
          spaces: [seatOf(0, 20), seatOf(30, 40), seatOf(40, 2)],
        },
      ]),
      [],
    );

    expect(map.rows.map((row) => row.seats.map((seat) => seat.x))).toEqual([
      [-10, 10, 69],
    ]);
    expect(map.rows.map((row) => row.gapAfter)).toEqual([["pod", null]]);
  });
});
