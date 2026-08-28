import {
  type NormalisedPosition,
  REFERENCE,
  type RankReasons,
  type Reading,
  type Seat,
  type SeatGroup,
  type SeatGroupTerms,
  type SeatProfile,
  type Scored,
  type Showtime,
  normalised,
  scoringIn,
  seatGroupsIn,
} from "@seatscout/core";

export interface RankingTerms extends SeatGroupTerms {
  readonly profile?: SeatProfile;
}

interface RemovedSeats {
  readonly unavailable: number;
  readonly accessible: number;
}

export interface SeatGroupResult {
  readonly key: string;
  readonly score: number;
  readonly seats: readonly Seat[];
  readonly podDividers: number;
  readonly position: NormalisedPosition;
  readonly reasons: RankReasons;
  readonly showtime: Omit<Showtime, "ticketing">;
  readonly removed: RemovedSeats;
  readonly fetchedAt: number;
  readonly attempts: number;
}

interface Ranked extends Scored {
  readonly group: SeatGroup<Seat>;
}

export interface Ranking {
  readonly offered: readonly Ranked[];
  readonly holding: (group: SeatGroup<Seat>) => Ranked | null;
  readonly resultOf: (showtime: Showtime, ranked: Ranked) => SeatGroupResult;
}

const removedFrom = (
  seats: readonly Seat[],
  terms: SeatGroupTerms,
): RemovedSeats => ({
  unavailable: seats.filter((seat) => !seat.bookable).length,
  accessible: terms.accessibleSeating
    ? 0
    : seats.filter((seat) => seat.bookable && seat.designation !== "standard")
        .length,
});

export const rankingIn = (
  auditorium: Extract<Reading<readonly Seat[]>, { ok: true }>,
  terms: RankingTerms,
): Ranking => {
  const placed = normalised(auditorium.payload);
  const score = scoringIn(placed, terms.profile ?? REFERENCE);
  const removed = removedFrom(auditorium.payload, terms);
  const rank = (group: SeatGroup<Seat & NormalisedPosition>): Ranked => ({
    group,
    ...score(group),
  });
  return {
    offered: seatGroupsIn(placed, terms)
      .map(rank)
      .toSorted((left, right) => right.score - left.score),
    holding: (group) => {
      const held = group.seats.flatMap((wanted) =>
        placed.filter((seat) => seat.id === wanted.id && seat.bookable),
      );
      return held.length === group.seats.length
        ? rank({ seats: held, podDividers: group.podDividers })
        : null;
    },
    resultOf: (showtime, ranked) => ({
      key: `${showtime.id}:${ranked.group.seats.map((seat) => seat.id).join("+")}`,
      score: ranked.score,
      seats: ranked.group.seats,
      podDividers: ranked.group.podDividers,
      position: ranked.position,
      reasons: ranked.reasons,
      showtime: {
        id: showtime.id,
        startsAt: showtime.startsAt,
        presentation: showtime.presentation,
      },
      removed,
      fetchedAt: auditorium.fetchedAt,
      attempts: auditorium.attempts,
    }),
  };
};
