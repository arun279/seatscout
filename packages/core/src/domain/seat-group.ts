import type { Seat } from "../source/seat-map.js";

export interface SeatGroup {
  readonly seats: readonly Seat[];
  readonly podDividers: number;
}

export interface SeatGroupTerms {
  readonly partySize: number;
  readonly accessibleSeating: boolean;
}

type Gap = "pod" | "aisle" | null;

interface Run {
  readonly seats: readonly Seat[];
  readonly gaps: readonly Gap[];
}

const CONTIGUOUS_PITCH = 1.45;
const AISLE_PITCH = 2.05;

const accessible = (seat: Seat) => seat.designation !== "standard";

const gapBetween = (left: Seat, right: Seat): Gap => {
  const pitch = (right.x - left.x) / left.width;
  if (pitch <= CONTIGUOUS_PITCH) return null;
  if (pitch > AISLE_PITCH) return "aisle";
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
    .sort(([nearer], [further]) => nearer - further)
    .map(([, row]) => row.toSorted((left, right) => left.x - right.x));
};

const runsIn = (
  row: readonly Seat[],
  eligible: (seat: Seat) => boolean,
): readonly Run[] => {
  const runs: Run[] = [];
  let previous: Seat | undefined;
  let current: { seats: Seat[]; gaps: Gap[] } | undefined;
  for (const seat of row) {
    const gap = previous === undefined ? null : gapBetween(previous, seat);
    previous = seat;
    if (!eligible(seat)) {
      current = undefined;
      continue;
    }
    if (gap === "aisle") current = undefined;
    if (current === undefined) {
      current = { seats: [], gaps: [] };
      runs.push(current);
    } else current.gaps.push(gap);
    current.seats.push(seat);
  }
  return runs;
};

const podsIn = (run: Run, start: number, partySize: number) =>
  run.gaps.slice(start, start + partySize - 1).filter((gap) => gap === "pod")
    .length;

const seatGroupFrom = (run: Run, partySize: number): SeatGroup | null => {
  const slack = run.seats.length - partySize;
  if (slack < 0) return null;
  const chosen = Array.from({ length: slack + 1 }, (_, start) => ({
    start,
    podDividers: podsIn(run, start, partySize),
    offCentre: Math.abs(slack - 2 * start),
  })).reduce((best, window) =>
    window.podDividers < best.podDividers ||
    (window.podDividers === best.podDividers &&
      window.offCentre < best.offCentre)
      ? window
      : best,
  );
  return {
    seats: run.seats.slice(chosen.start, chosen.start + partySize),
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
    .map((run) => seatGroupFrom(run, terms.partySize))
    .filter((group) => group !== null);
};
