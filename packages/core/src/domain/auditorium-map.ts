import type { Seat } from "../source/seat-map.js";
import { type NormalisedPosition, normalised } from "./auditorium.js";
import { type Gap, gapBetween, rowsOf } from "./seat-group.js";

export type PositionedSeat = Seat & NormalisedPosition;

export interface SeatRow {
  readonly ordinalFromFront: number;
  readonly label: string | null;
  readonly depth: number;
  readonly seats: readonly PositionedSeat[];
  readonly bookableCount: number;
  readonly gapAfter: readonly Gap[];
}

export interface AuditoriumMap {
  readonly rows: readonly SeatRow[];
  readonly seatCount: number;
  readonly bookableCount: number;
  readonly recommended: {
    readonly row: number;
    readonly seats: readonly number[];
  } | null;
}

const bookableIn = (seats: readonly Seat[]) =>
  seats.filter((seat) => seat.bookable).length;

const gapsAlong = (seats: readonly Seat[]): readonly Gap[] => {
  const gaps: Gap[] = [];
  let left: Seat | null = null;
  for (const seat of seats) {
    if (left !== null) gaps.push(gapBetween(left, seat));
    left = seat;
  }
  return gaps;
};

const labelOf = (row: readonly Seat[]) => {
  const initial = row
    .map((seat) => seat.id.slice(0, 1))
    .reduce((left, right) => (left === right ? left : ""));
  return initial === "" ? null : initial;
};

const seatRowsOf = (seats: readonly Seat[]): readonly SeatRow[] =>
  rowsOf(normalised(seats)).map((row, index) => ({
    ordinalFromFront: index + 1,
    label: labelOf(row),
    depth: row[0].depth,
    seats: row,
    bookableCount: bookableIn(row),
    gapAfter: gapsAlong(row),
  }));

export const auditoriumMap = (
  seats: readonly Seat[],
  recommended: readonly Seat[],
): AuditoriumMap => {
  const wanted = new Set(recommended.map((seat) => seat.id));
  const rows = seatRowsOf(seats);

  return {
    rows,
    seatCount: seats.length,
    bookableCount: bookableIn(seats),
    recommended:
      rows
        .map((row, index) => ({
          row: index,
          seats: row.seats.flatMap((seat, at) =>
            wanted.has(seat.id) ? [at] : [],
          ),
        }))
        .find((row) => row.seats.length > 0) ?? null,
  };
};

interface Run {
  readonly from: number;
  readonly to: number;
}

export type AuditoriumPlan = readonly {
  readonly depth: number;
  readonly runs: readonly Run[];
}[];

const runsAlong = (row: SeatRow): readonly Run[] =>
  row.seats.reduce<Run[]>((runs, seat, at) => {
    const last = runs.at(-1);
    if (last === undefined || row.gapAfter[at - 1] === "aisle")
      runs.push({ from: seat.lateral, to: seat.lateral });
    else runs[runs.length - 1] = { from: last.from, to: seat.lateral };
    return runs;
  }, []);

export const planOf = (seats: readonly Seat[]): AuditoriumPlan =>
  seatRowsOf(seats).map((row) => ({
    depth: row.depth,
    runs: runsAlong(row),
  }));

export const nearestInRow = (row: SeatRow, lateral: number) =>
  row.seats
    .map((seat, index) => ({ index, away: Math.abs(seat.lateral - lateral) }))
    .reduce((nearest, seat) => (seat.away < nearest.away ? seat : nearest))
    .index;
