import * as fc from "fast-check";
import type { Designation, Seat } from "../source/seat-map.js";
import { type SeatGroupTerms, seatGroupsIn } from "./seat-group.js";

export type Band = "contiguous" | "pod" | "aisle";

interface Cell {
  readonly gapBefore: Band;
  readonly designation: Designation;
  readonly bookable: boolean;
}

interface Placed {
  readonly seat: Seat;
  readonly cell: Cell;
  readonly column: number;
}

export interface Room {
  readonly seats: readonly Seat[];
  readonly placed: ReadonlyMap<string, Placed>;
}

export interface Pair {
  readonly lower: Seat;
  readonly higher: Seat;
}

export const FETCHED_AT = 1000;
const SEAT_WIDTH = 100;
const ROW_PITCH = 500;

const SPACING: Readonly<Record<Band, number>> = {
  contiguous: 130,
  pod: 180,
  aisle: 300,
};

export const cellOf = (
  gapBefore: Band,
  bookable: boolean,
  designation: Designation = "standard",
): Cell => ({ gapBefore, designation, bookable });

export const free = (gapBefore: Band = "contiguous") => cellOf(gapBefore, true);
const taken = (gapBefore: Band = "contiguous") => cellOf(gapBefore, false);

const seatAt = (id: string, x: number, y: number, cell: Cell): Seat => ({
  id,
  designation: cell.designation,
  bookable: cell.bookable,
  x,
  y,
  width: SEAT_WIDTH,
  height: SEAT_WIDTH,
  leftNeighbour: null,
  rightNeighbour: null,
  provenance: {
    source: "aggregator",
    fetchedAt: FETCHED_AT,
    upstreamStatus: cell.bookable ? "A" : "R",
  },
});

export const roomFrom = (rows: readonly (readonly Cell[])[]): Room => {
  const placed = rows.flatMap((row, depth) =>
    row.map((cell, column) => ({
      cell,
      column,
      seat: seatAt(
        `${depth}.${column}`,
        row
          .slice(1, column + 1)
          .reduce((x, before) => x + SPACING[before.gapBefore], 0),
        depth * ROW_PITCH,
        cell,
      ),
    })),
  );
  return {
    seats: placed.map((entry) => entry.seat),
    placed: new Map(placed.map((entry) => [entry.seat.id, entry])),
  };
};

export const bandBetween = ({ lower, higher }: Pair): Band => {
  const pair = [lower, higher].map((seat) => ({ ...seat, bookable: true }));
  const [group] = seatGroupsIn(pair, {
    partySize: 2,
    accessibleSeating: pair.some((seat) => seat.designation !== "standard"),
  });
  if (group === undefined) return "aisle";
  return group.podDividers === 1 ? "pod" : "contiguous";
};

export const pairAt = (
  spacing: number,
  left: Designation,
  right: Designation,
): Pair => ({
  lower: seatAt("0.0", 0, 0, cellOf("contiguous", true, left)),
  higher: seatAt("0.1", spacing, 0, cellOf("contiguous", true, right)),
});

export const accessibleIn = (seats: readonly Seat[]) =>
  seats.filter((seat) => seat.designation !== "standard").length;

const designation = fc.oneof(
  { arbitrary: fc.constant<Designation>("standard"), weight: 6 },
  { arbitrary: fc.constant<Designation>("wheelchair"), weight: 1 },
  { arbitrary: fc.constant<Designation>("companion"), weight: 1 },
);

const gapBefore = fc.oneof(
  { arbitrary: fc.constant<Band>("contiguous"), weight: 6 },
  { arbitrary: fc.constant<Band>("pod"), weight: 3 },
  { arbitrary: fc.constant<Band>("aisle"), weight: 1 },
);

const ADVERSARIAL_ROWS: readonly (readonly Cell[])[] = [
  [free()],
  [free(), free()],
  Array.from({ length: 10 }, () => free()),
  Array.from({ length: 10 }, () => taken()),
  Array.from({ length: 10 }, (_, column) =>
    column % 2 === 0 ? free() : taken(),
  ),
  [free(), free("aisle"), free(), free(), free(), free("aisle"), free()],
  [
    free(),
    free(),
    cellOf("pod", true, "wheelchair"),
    cellOf("pod", true, "companion"),
    free(),
    free(),
  ],
  [free(), free("pod"), free(), free("pod"), free()],
  [free(), taken("aisle"), free("aisle"), free()],
];

const rows = fc.oneof(
  fc.constantFrom(...ADVERSARIAL_ROWS),
  fc.array(fc.record({ gapBefore, designation, bookable: fc.boolean() }), {
    minLength: 1,
    maxLength: 12,
  }),
);

export const rooms = fc
  .array(rows, { minLength: 1, maxLength: 6 })
  .map(roomFrom);

export const partySize = fc.integer({ min: 1, max: 6 });

export const terms: fc.Arbitrary<SeatGroupTerms> = fc.record({
  partySize,
  accessibleSeating: fc.boolean(),
});
