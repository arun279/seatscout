import type { Coverage, SeatGroupResult, Snapshot } from "@seatscout/client";

export const accountOf = (
  coverage: Coverage,
): {
  readonly candidates: number;
  readonly checked: number;
  readonly remaining: number;
} => {
  const named =
    coverage.started.length +
    coverage.noSeatMap.length +
    coverage.soldOut.length +
    coverage.salesOff.length +
    coverage.unidentified.length +
    coverage.failed.length;
  return {
    candidates: coverage.candidates,
    checked: coverage.checked,
    remaining: coverage.candidates - coverage.checked - named,
  };
};

export const seatsOf = (result: SeatGroupResult): readonly string[] =>
  result.seats.map((seat) => seat.id);

export const unreachedIn = (snapshot: Snapshot): number =>
  snapshot.coverage.failed.length + accountOf(snapshot.coverage).remaining;

export const beingReadIn = (snapshot: Snapshot): number => {
  const { remaining } = accountOf(snapshot.coverage);
  return remaining > 0 ? remaining : snapshot.coverage.failed.length;
};

const tied = (result: SeatGroupResult) => result.reasons.tiedAtRoomResolution;

export const tiedIn = (results: readonly SeatGroupResult[]): number =>
  results.filter(tied).length;

const soonest = (left: SeatGroupResult, right: SeatGroupResult) =>
  left.showtime.startsAt.localeCompare(right.showtime.startsAt) ||
  left.showtime.id - right.showtime.id;

export const listed = (
  results: readonly SeatGroupResult[],
): readonly SeatGroupResult[] => [
  ...results.filter(tied).toSorted(soonest),
  ...results.filter((result) => !tied(result)),
];
