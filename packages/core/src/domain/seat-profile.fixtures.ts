import { expect } from "vitest";
import type { Seat } from "../source/seat-map.js";
import { type NormalisedPosition, normalised } from "./auditorium.js";
import type { SeatGroup } from "./seat-group.js";
import {
  REFERENCE,
  type Scored,
  type SeatProfile,
  scoringIn,
} from "./seat-profile.js";

export type Positioned = Seat & NormalisedPosition;
export type Auditorium = readonly Positioned[];

interface RowSpec {
  readonly gap: number;
  readonly pitch: number;
  readonly width: number;
  readonly seats: number;
  readonly shift: number;
}

export const FETCHED_AT = 1000;
export const SEAT_WIDTH = 10;
export const ROW_GAP = 20;

export const seatAt = (
  id: string,
  x: number,
  y: number,
  width: number,
): Seat => ({
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

export const drawn = (rows: readonly RowSpec[]): Auditorium =>
  normalised(
    rows.flatMap((row, index) =>
      Array.from({ length: row.seats }, (_, seat) =>
        seatAt(
          `${index}.${seat}`,
          row.shift -
            ((row.seats - 1) * row.pitch) / 2 +
            seat * row.pitch -
            row.width / 2,
          rows.slice(1, index + 1).reduce((y, above) => y + above.gap, 0),
          row.width,
        ),
      ),
    ),
  );

export const rowOf = (
  seats: number,
  shift = 0,
  width = SEAT_WIDTH,
): RowSpec => ({
  gap: ROW_GAP,
  pitch: SEAT_WIDTH,
  width,
  seats,
  shift,
});

export const alone = (seat: Positioned): SeatGroup<Positioned> => ({
  seats: [seat],
  podDividers: 0,
});

export const scoreOf = (
  auditorium: Auditorium,
  profile: SeatProfile,
  group: SeatGroup<Positioned>,
) => scoringIn(auditorium, profile)(group).score;

interface Ranked extends Scored {
  readonly seat: Positioned;
}

export const rankedIn = (
  auditorium: Auditorium,
  profile: SeatProfile,
): readonly Ranked[] => {
  const score = scoringIn(auditorium, profile);
  return auditorium.map((seat) => ({ seat, ...score(alone(seat)) }));
};

export const bestOf = (ranked: readonly Ranked[]) =>
  ranked.reduce((best, candidate) =>
    candidate.score > best.score ? candidate : best,
  );

export const rowsIn = (auditorium: Auditorium) =>
  [...new Set(auditorium.map((seat) => seat.depth))]
    .sort((nearer, further) => nearer - further)
    .map((depth) => auditorium.filter((seat) => seat.depth === depth));

const outwardRuns = (ranked: readonly Ranked[]) =>
  [...new Set(ranked.map((one) => one.seat.depth))].flatMap((depth) => {
    const row = ranked.filter((one) => one.seat.depth === depth);
    return [
      row
        .filter((one) => one.seat.seatsOffCentre >= 0)
        .toSorted(
          (left, right) => left.seat.seatsOffCentre - right.seat.seatsOffCentre,
        ),
      row
        .filter((one) => one.seat.seatsOffCentre <= 0)
        .toSorted(
          (left, right) => right.seat.seatsOffCentre - left.seat.seatsOffCentre,
        ),
    ];
  });

export const judged = (auditorium: Auditorium, profile: SeatProfile) => {
  const ranked = rankedIn(auditorium, profile);
  const top = bestOf(ranked);
  return {
    onTheCentreline:
      Math.abs(top.seat.seatsOffCentre) ===
      Math.min(
        ...ranked
          .filter((one) => one.seat.depth === top.seat.depth)
          .map((one) => Math.abs(one.seat.seatsOffCentre)),
      ),
    withinOneRowOfTarget:
      Math.abs(
        top.reasons.rowFromFront -
          (profile.targetDepth * (top.reasons.rowCount - 1) + 1),
      ) <= 1,
    fallingOutward: outwardRuns(ranked).every((run) =>
      run.every((one, index) => {
        const inner = run[index - 1];
        return inner === undefined || one.score <= inner.score + 1e-12;
      }),
    ),
  };
};

const rightReachOf = (row: Auditorium) =>
  Math.max(...row.map((seat) => seat.seatsOffCentre));

const equalOffsetPenalty = (
  auditorium: Auditorium,
  profile: SeatProfile,
  row: Auditorium,
  offset: number,
) => {
  const score = scoringIn(auditorium, profile);
  const [seat] = row;
  if (seat === undefined) throw new Error("an Auditorium row with no Seat");
  const at = (seatsOffCentre: number) =>
    score(alone({ ...seat, seatsOffCentre }));
  const centre = at(0);
  const outward = at(offset);
  expect(outward.reasons.againstWall).toBe(centre.reasons.againstWall);
  return centre.score - outward.score;
};

export const punishesTheFrontRowHarder = (
  auditorium: Auditorium,
  profile: SeatProfile,
) => {
  const rows = rowsIn(auditorium);
  const front = rows.at(0);
  const back = rows.at(-1);
  if (front === undefined || back === undefined || front === back) return null;
  const offset = Math.min(rightReachOf(front), rightReachOf(back)) / 2;
  if (offset <= 0) return null;
  return (
    equalOffsetPenalty(auditorium, profile, front, offset) >
    equalOffsetPenalty(auditorium, profile, back, offset) + 1e-9
  );
};

export const SEPARABLE: SeatProfile = { ...REFERENCE, rowPitch: 0 };

export const sweptWeightings = () =>
  [0.25, 1, 2].flatMap((depthWeight) =>
    [0.25, 1, 2].flatMap((offAxisWeight) =>
      [0, 0.25].flatMap((frontBandWeight) =>
        [0, 0.25].flatMap((wallBandWeight) =>
          [6, 24].flatMap((screenGap) =>
            [1, 2.3].map((rowPitch) => ({
              depthWeight,
              offAxisWeight,
              frontBandWeight,
              wallBandWeight,
              screenGap,
              rowPitch,
            })),
          ),
        ),
      ),
    ),
  );
