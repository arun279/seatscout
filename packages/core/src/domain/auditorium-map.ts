import type { Seat } from "../source/seat-map.js";
import { type NormalisedPosition, normalised } from "./auditorium.js";
import { type Gap, gapBetween } from "./seat-group.js";

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
  };
}

const bookableIn = (seats: readonly Seat[]) =>
  seats.filter((seat) => seat.bookable).length;

const rowsOf = <T extends NormalisedPosition>(seats: readonly T[]) =>
  [...new Set(seats.map((seat) => seat.depth))]
    .sort((nearer, further) => nearer - further)
    .map((depth) => ({
      depth,
      seats: seats
        .filter((seat) => seat.depth === depth)
        .toSorted((left, right) => left.lateral - right.lateral),
    }));

const gapsAlong = (seats: readonly Seat[]): readonly Gap[] => {
  const gaps: Gap[] = [];
  let left: Seat | null = null;
  for (const seat of seats) {
    if (left !== null) gaps.push(gapBetween(left, seat));
    left = seat;
  }
  return gaps;
};

const agreed = (left: string, right: string) => (left === right ? left : "");

const labelOf = (row: readonly Seat[]) => {
  const initial = row.map((seat) => seat.id.slice(0, 1)).reduce(agreed);
  return initial === "" ? null : initial;
};

export const auditoriumMap = (
  seats: readonly Seat[],
  recommended: readonly Seat[],
): AuditoriumMap => {
  const placed = normalised(seats);
  const wanted = new Set(recommended.map((seat) => seat.id));
  const rows = rowsOf(placed).map((row, index) => ({
    ordinalFromFront: index + 1,
    label: labelOf(row.seats),
    depth: row.depth,
    seats: row.seats,
    bookableCount: bookableIn(row.seats),
    gapAfter: gapsAlong(row.seats),
  }));

  return {
    rows,
    seatCount: seats.length,
    bookableCount: bookableIn(seats),
    recommended: rows
      .map((row, index) => ({
        row: index,
        seats: row.seats.flatMap((seat, at) =>
          wanted.has(seat.id) ? [at] : [],
        ),
      }))
      .find((row) => row.seats.length > 0) ?? { row: 0, seats: [] },
  };
};

export const nearestInRow = (row: SeatRow, lateral: number) =>
  row.seats
    .map((seat, index) => ({ index, away: Math.abs(seat.lateral - lateral) }))
    .reduce((nearest, seat) => (seat.away < nearest.away ? seat : nearest))
    .index;
