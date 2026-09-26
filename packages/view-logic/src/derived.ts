import type { Coverage, SeatGroupResult, Snapshot } from "@seatscout/client";

export interface Account {
  readonly candidates: number;
  readonly checked: number;
  readonly remaining: number;
}

export const accountOf = (coverage: Coverage): Account => {
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

export const unreadIn = (snapshot: Snapshot): number =>
  snapshot.days.reduce((unread, day) => unread + day.unread, 0);

export const toGoIn = (snapshot: Snapshot): number =>
  accountOf(snapshot.coverage).remaining - unreadIn(snapshot);

export const unreachedIn = (snapshot: Snapshot): number =>
  snapshot.coverage.failed.length + toGoIn(snapshot);

export const beingReadIn = (snapshot: Snapshot): number => {
  const toGo = toGoIn(snapshot);
  return toGo > 0 ? toGo : snapshot.coverage.failed.length;
};

const tied = (result: SeatGroupResult) => result.reasons.tiedAtRoomResolution;

const bandsOf = (
  results: readonly SeatGroupResult[],
): readonly (readonly SeatGroupResult[])[] =>
  [...new Set(results.map((result) => result.terms.date))].map((date) =>
    results.filter((result) => result.terms.date === date),
  );

export const tiedIn = (results: readonly SeatGroupResult[]): number =>
  (bandsOf(results)[0] ?? []).filter(tied).length;

const soonest = (left: SeatGroupResult, right: SeatGroupResult) =>
  left.showtime.startsAt.localeCompare(right.showtime.startsAt) ||
  left.showtime.id - right.showtime.id;

export const listed = (
  results: readonly SeatGroupResult[],
): readonly SeatGroupResult[] =>
  bandsOf(results).flatMap((band) => [
    ...band.filter(tied).sort(soonest),
    ...band.filter((result) => !tied(result)),
  ]);
