import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { normalised } from "./auditorium.js";
import {
  type Auditorium,
  auditoriums,
  drawn,
  rankedIn,
  sweptWeightings,
} from "./seat-profile.fixtures.js";
import { REFERENCE, type SeatProfile } from "./seat-profile.js";

const TIE = 1e-9;

const weightings = fc.constantFrom(...sweptWeightings());

const unit = (min: number, max: number) => fc.double({ min, max, noNaN: true });

const ordered = (one: number, other: number): readonly [number, number] =>
  one <= other ? [one, other] : [other, one];

const furthestOf = (
  ranked: ReturnType<typeof rankedIn>,
  along: "depth" | "seatsOffCentre",
) => {
  const top = Math.max(...ranked.map((one) => one.score));
  return Math.max(
    ...ranked
      .filter((one) => one.score >= top - TIE)
      .map((one) => one.seat[along]),
  );
};

const furthestBest = (
  room: Auditorium,
  profile: SeatProfile,
  along: "depth" | "seatsOffCentre",
) => furthestOf(rankedIn(room, profile), along);

const rightmostBestByRow = (room: Auditorium, profile: SeatProfile) => {
  const ranked = rankedIn(room, profile);
  return [...new Set(room.map((seat) => seat.depth))].map((depth) =>
    furthestOf(
      ranked.filter((one) => one.seat.depth === depth),
      "seatsOffCentre",
    ),
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

  it("never moves a row's best Seat to house left when the target moves to house right, in any room, under any weighting", () => {
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
            rightmostBestByRow(room, {
              ...REFERENCE,
              ...weights,
              targetLateral,
            });
          const before = at(lefter);
          const after = at(righter);

          expect(before.map((seat, row) => seat <= (after[row] ?? -1))).toEqual(
            before.map(() => true),
          );
        },
      ),
      { numRuns: 300 },
    );
  });

  it("can move the room's best Seat to house left when the target moves right, because a far row's angle costs less than a near row's, so the law holds within a row and not across the room", () => {
    const room = drawn([
      { gap: 20, pitch: 50, width: 10, seats: 2, shift: 35 },
      { gap: 20, pitch: 10, width: 10, seats: 1, shift: -60 },
    ]);
    const profile = {
      ...REFERENCE,
      frontBandWeight: 0,
      wallBandWeight: 0,
      rowPitch: 20.7,
      targetDepth: 0.5,
    };
    const at = (targetLateral: number) =>
      furthestBest(room, { ...profile, targetLateral }, "seatsOffCentre");

    expect(room.map((seat) => seat.seatsOffCentre)).toEqual([1, 6, -6]);
    expect([at(0), at(0.6)]).toEqual([1, -6]);
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
