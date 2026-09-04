import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { Seat } from "../source/seat-map.js";
import {
  FETCHED_AT,
  depthsOf,
  extentOf,
  lateralsOf,
} from "./auditorium.fixtures.js";
import {
  type NormalisedPosition,
  type Placement,
  normalised,
} from "./auditorium.js";

interface Row {
  readonly gap: number;
  readonly origin: number;
  readonly pitch: number;
  readonly widths: readonly number[];
}

const ascending = (values: readonly number[]) =>
  [...new Set(values)].sort((first, second) => first - second);

const offCentreOf = (auditorium: readonly NormalisedPosition[]) =>
  auditorium.map((seat) => seat.seatsOffCentre);

const negated = (values: readonly number[]) => values.map((value) => 0 - value);

const seatAt = (id: string, x: number, y: number, width: number): Seat => ({
  id,
  designation: "standard",
  bookable: true,
  x,
  y,
  width,
  height: width,
  leftNeighbour: null,
  rightNeighbour: null,
  provenance: {
    source: "aggregator",
    fetchedAt: FETCHED_AT,
    upstreamStatus: "A",
  },
});

const lyingLabel = (rows: number, row: number, seat: number) =>
  `${String.fromCharCode(65 + rows - 1 - row)}${999 - seat}`;

const yOf = (rows: readonly Row[], index: number) =>
  rows.slice(1, index + 1).reduce((total, row) => total + row.gap, 0);

const drawn = (rows: readonly Row[]): Seat[] =>
  rows.flatMap((row, index) =>
    row.widths.map((width, seat) =>
      seatAt(
        lyingLabel(rows.length, index, seat),
        row.origin + seat * row.pitch,
        yOf(rows, index),
        width,
      ),
    ),
  );

const rowOf = fc.record({
  gap: fc.integer({ min: 1, max: 40 }),
  origin: fc.integer({ min: -60, max: 60 }),
  pitch: fc.integer({ min: 0, max: 30 }),
  widths: fc.array(fc.integer({ min: 1, max: 20 }), {
    minLength: 1,
    maxLength: 12,
  }),
});

const loneSeatRow = rowOf.map((row) => ({
  ...row,
  widths: row.widths.slice(0, 1),
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

describe("the normalised Auditorium", () => {
  it("puts the front row at 0.0 and the back row at 1.0, and moves depth only when the row does", () => {
    const shapes = { oneRow: 0, manyRows: 0 };

    fc.assert(
      fc.property(auditoriums, (seats) => {
        const auditorium = normalised(seats);
        const rows = ascending(auditorium.map((seat) => seat.y));
        const depths = ascending(depthsOf(auditorium));

        if (rows.length === 1) shapes.oneRow += 1;
        else shapes.manyRows += 1;

        expect(auditorium.map((seat) => depths.indexOf(seat.depth))).toEqual(
          auditorium.map((seat) => rows.indexOf(seat.y)),
        );
        expect(extentOf(depths)).toEqual(rows.length === 1 ? [0, 0] : [0, 1]);
      }),
      { numRuns: 300 },
    );

    expect(shapes.oneRow).toBeGreaterThan(0);
    expect(shapes.manyRows).toBeGreaterThan(0);
  });

  it("takes depth from the row's place in the order, never from how far apart the rows are drawn", () => {
    const spacings = { uneven: 0 };

    fc.assert(
      fc.property(layouts, (rows) => {
        if (new Set(rows.slice(1).map((row) => row.gap)).size > 1)
          spacings.uneven += 1;

        expect(
          depthsOf(normalised(drawn(rows.map((row) => ({ ...row, gap: 1 }))))),
        ).toEqual(depthsOf(normalised(drawn(rows))));
      }),
      { numRuns: 300 },
    );

    expect(spacings.uneven).toBeGreaterThan(0);
  });

  it("puts the far left Seat at -1.0 and the far right at +1.0, ordered by seat centre", () => {
    const shapes = { oneCentre: 0, manyCentres: 0 };

    fc.assert(
      fc.property(auditoriums, (seats) => {
        const auditorium = normalised(seats);
        const centres = ascending(
          auditorium.map((seat) => seat.x + seat.width / 2),
        );
        const laterals = ascending(lateralsOf(auditorium));

        if (centres.length === 1) shapes.oneCentre += 1;
        else shapes.manyCentres += 1;

        expect(
          auditorium.map((seat) => laterals.indexOf(seat.lateral)),
        ).toEqual(
          auditorium.map((seat) => centres.indexOf(seat.x + seat.width / 2)),
        );
        expect(extentOf(laterals)).toEqual(
          centres.length === 1 ? [0, 0] : [-1, 1],
        );
      }),
      { numRuns: 300 },
    );

    expect(shapes.oneCentre).toBeGreaterThan(0);
    expect(shapes.manyCentres).toBeGreaterThan(0);
  });

  it("negates every sideways measure when the Auditorium is drawn mirrored, and leaves depth alone", () => {
    fc.assert(
      fc.property(
        auditoriums,
        fc.integer({ min: -500, max: 500 }),
        (seats, axis) => {
          const auditorium = normalised(seats);
          const mirrored = normalised(
            seats.map((seat) => ({ ...seat, x: axis - seat.x - seat.width })),
          );

          expect(lateralsOf(mirrored)).toEqual(negated(lateralsOf(auditorium)));
          expect(offCentreOf(mirrored)).toEqual(
            negated(offCentreOf(auditorium)),
          );
          expect(depthsOf(mirrored)).toEqual(depthsOf(auditorium));
        },
      ),
      { numRuns: 300 },
    );
  });

  it("gives the same positions however the Seats are labelled", () => {
    fc.assert(
      fc.property(auditoriums, fc.func(fc.string()), (seats, label) => {
        const relabelled = normalised(
          seats.map((seat, index) => ({ ...seat, id: label(index) })),
        );
        const auditorium = normalised(seats);

        expect(depthsOf(relabelled)).toEqual(depthsOf(auditorium));
        expect(lateralsOf(relabelled)).toEqual(lateralsOf(auditorium));
      }),
      { numRuns: 300 },
    );
  });

  it("normalises Seats that carry no label at all, because it never reads one", () => {
    const withoutLabels: readonly Placement[] = [
      { x: 0, y: 40, width: 10 },
      { x: 30, y: 0, width: 10 },
      { x: 10, y: 0, width: 20 },
    ];

    expect(normalised(withoutLabels)).toEqual([
      { x: 0, y: 40, width: 10, depth: 1, lateral: -1, seatsOffCentre: -1.5 },
      { x: 30, y: 0, width: 10, depth: 0, lateral: 1, seatsOffCentre: 1.5 },
      { x: 10, y: 0, width: 20, depth: 0, lateral: 0, seatsOffCentre: 0 },
    ]);
  });

  it("puts a lone Seat on the centreline of the front row", () => {
    expect(normalised([{ x: 17, y: 9, width: 4 }])).toEqual([
      { x: 17, y: 9, width: 4, depth: 0, lateral: 0, seatsOffCentre: 0 },
    ]);
  });
});
