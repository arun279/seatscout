import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { normalised } from "./auditorium.js";
import {
  type Auditorium,
  auditoriums,
  rankedIn,
  sweptWeightings,
} from "./seat-profile.fixtures.js";
import { REFERENCE, type SeatProfile } from "./seat-profile.js";

const TIE = 1e-9;

const weightings = fc.constantFrom(...sweptWeightings());

const unit = (min: number, max: number) => fc.double({ min, max, noNaN: true });

const ordered = (one: number, other: number): readonly [number, number] =>
  one <= other ? [one, other] : [other, one];

const furthestBest = (
  room: Auditorium,
  profile: SeatProfile,
  along: "depth" | "seatsOffCentre",
) => {
  const ranked = rankedIn(room, profile);
  const top = Math.max(...ranked.map((one) => one.score));
  return Math.max(
    ...ranked
      .filter((one) => one.score >= top - TIE)
      .map((one) => one.seat[along]),
  );
};

describe("the best Seat as the Profile's target moves", () => {
  it("never comes forward when the target moves back, in any room, under any weighting", () => {
    fc.assert(
      fc.property(
        auditoriums,
        weightings,
        unit(0, 1),
        unit(0, 1),
        (seats, weights, one, other) => {
          const room = normalised(seats);
          const [nearer, further] = ordered(one, other);
          const at = (targetDepth: number) =>
            furthestBest(
              room,
              { ...REFERENCE, ...weights, targetDepth },
              "depth",
            );

          expect(at(nearer)).toBeLessThanOrEqual(at(further));
        },
      ),
      { numRuns: 300 },
    );
  });

  it("never moves to house left when the target moves to house right, in any room, under any weighting", () => {
    fc.assert(
      fc.property(
        auditoriums,
        weightings,
        unit(-1, 1),
        unit(-1, 1),
        (seats, weights, one, other) => {
          const room = normalised(seats);
          const [lefter, righter] = ordered(one, other);
          const at = (targetLateral: number) =>
            furthestBest(
              room,
              { ...REFERENCE, ...weights, targetLateral },
              "seatsOffCentre",
            );

          expect(at(lefter)).toBeLessThanOrEqual(at(righter));
        },
      ),
      { numRuns: 300 },
    );
  });

  it("moves with the target across a real shape of room, so the law is not vacuous", () => {
    const room = normalised(
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap((row) =>
        [0, 1, 2, 3, 4, 5, 6].map((seat) => ({
          id: `${row}.${seat}`,
          designation: "standard" as const,
          bookable: true,
          x: seat * 10,
          y: row * 20,
          width: 10,
          height: 10,
          leftNeighbour: null,
          rightNeighbour: null,
          provenance: {
            source: "aggregator" as const,
            fetchedAt: 0,
            upstreamStatus: "A",
          },
        })),
      ),
    );

    expect(
      [0, 0.33, 0.67, 1].map((targetDepth) =>
        furthestBest(room, { ...REFERENCE, targetDepth }, "depth"),
      ),
    ).toEqual([1 / 9, 3 / 9, 6 / 9, 8 / 9]);
  });
});
