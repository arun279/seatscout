import type { Coverage, SeatGroupResult, Snapshot } from "@seatscout/client";

export const accountOf = (coverage: Coverage) => {
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

export const unreachedIn = (snapshot: Snapshot): number =>
  snapshot.coverage.failed.length + accountOf(snapshot.coverage).remaining;

export const seatsOf = (result: SeatGroupResult) =>
  result.seats.map((seat) => seat.id).join("·");

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
