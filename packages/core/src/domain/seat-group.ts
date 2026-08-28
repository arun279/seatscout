import type { Seat } from "../source/seat-map.js";
import { centreOf } from "./auditorium.js";

export interface SeatGroup {
  readonly seats: readonly Seat[];
  readonly podDividers: number;
}

export interface SeatGroupTerms {
  readonly partySize: number;
  readonly accessibleSeating: boolean;
}

export type Gap = "pod" | "aisle" | null;

interface Placed {
  readonly seat: Seat;
  readonly gapBefore: Gap;
}

type Run = readonly Placed[];

const WIDEST_CONTIGUOUS_PITCH = 1.45;
const WIDEST_POD_PITCH = 2.05;

const accessible = (seat: Seat) => seat.designation !== "standard";

export const gapBetween = (left: Seat, right: Seat): Gap => {
  const pitch = (centreOf(right) - centreOf(left)) / left.width;
  if (pitch <= WIDEST_CONTIGUOUS_PITCH) return null;
  if (pitch > WIDEST_POD_PITCH) return "aisle";
  return accessible(left) || accessible(right) ? null : "pod";
};

const rowsOf = (seats: readonly Seat[]): readonly (readonly Seat[])[] => {
  const rows = new Map<number, Seat[]>();
  for (const seat of seats) {
    const row = rows.get(seat.y);
    if (row === undefined) rows.set(seat.y, [seat]);
    else row.push(seat);
  }
  return [...rows.entries()]
    .sort(([above], [below]) => above - below)
    .map(([, row]) =>
      row.toSorted((left, right) => centreOf(left) - centreOf(right)),
    );
};

const runsIn = (
  row: readonly Seat[],
  eligible: (seat: Seat) => boolean,
): readonly Run[] => {
  const runs: Placed[][] = [];
  let previous: Seat | undefined;
  let current: Placed[] | undefined;
  for (const seat of row) {
    const gapBefore =
      previous === undefined ? null : gapBetween(previous, seat);
    previous = seat;
    if (!eligible(seat)) {
      current = undefined;
      continue;
    }
    if (gapBefore === "aisle") current = undefined;
    if (current === undefined) {
      current = [];
      runs.push(current);
    }
    current.push({ seat, gapBefore });
  }
  return runs;
};

const seatGroupFrom = (run: Run, terms: SeatGroupTerms): SeatGroup | null => {
  const slack = run.length - terms.partySize;
  const windows = Array.from({ length: slack + 1 }, (_, start) => ({
    seats: run.slice(start, start + terms.partySize),
    podDividers: run
      .slice(start + 1, start + terms.partySize)
      .filter((placed) => placed.gapBefore === "pod").length,
    offCentre: Math.abs(slack - 2 * start),
  })).filter(
    (window) =>
      !terms.accessibleSeating ||
      window.seats.some((placed) => accessible(placed.seat)),
  );
  if (windows.length === 0) return null;
  const chosen = windows.reduce((best, window) =>
    window.podDividers < best.podDividers ||
    (window.podDividers === best.podDividers &&
      window.offCentre < best.offCentre)
      ? window
      : best,
  );
  return {
    seats: chosen.seats.map((placed) => placed.seat),
    podDividers: chosen.podDividers,
  };
};

export const seatGroupsIn = (
  seats: readonly Seat[],
  terms: SeatGroupTerms,
): readonly SeatGroup[] => {
  const eligible = (seat: Seat) =>
    seat.bookable && (terms.accessibleSeating || !accessible(seat));
  return rowsOf(seats)
    .flatMap((row) => runsIn(row, eligible))
    .map((run) => seatGroupFrom(run, terms))
    .filter((group) => group !== null);
};
