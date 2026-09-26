import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { normalised } from "./auditorium.js";
import {
  ascending,
  capturedSeatMap,
  seatsOf,
} from "./auditorium-map.fixtures.js";
import { planOf } from "./auditorium-map.js";
import { rooms } from "./seat-group.fixtures.js";

describe("the plan a result card draws", () => {
  it("draws each row as the runs its aisles divide it into, in seat-centre lateral", () => {
    const seats = seatsOf(capturedSeatMap("564614760"));

    const fullRow = [{ from: -1, to: 1 }];
    expect(planOf(seats)).toEqual([
      { depth: 0, runs: fullRow },
      { depth: 0.2, runs: fullRow },
      { depth: 0.4, runs: fullRow },
      { depth: 0.6, runs: fullRow },
      { depth: 0.8, runs: fullRow },
      {
        depth: 1,
        runs: [
          { from: -5 / 6, to: 0 },
          { from: 1 / 3, to: 5 / 6 },
        ],
      },
    ]);
  });

  it("places every Seat in exactly one run of its own row, left to right", () => {
    fc.assert(
      fc.property(rooms, ({ seats }) => {
        const plan = planOf(seats);
        const placed = normalised(seats);

        expect(plan.map((row) => row.depth)).toEqual(
          ascending(placed.map((seat) => seat.depth)),
        );
        for (const row of plan) {
          const here = placed
            .filter((seat) => seat.depth === row.depth)
            .map((seat) => seat.lateral);
          expect(
            here.filter(
              (lateral) =>
                row.runs.filter(
                  (run) => run.from <= lateral && lateral <= run.to,
                ).length === 1,
            ),
          ).toHaveLength(here.length);
          expect(row.runs.filter((run) => run.from > run.to)).toEqual([]);
          expect(
            row.runs.filter(
              (run, at) => (row.runs[at + 1]?.from ?? 2) <= run.to,
            ),
          ).toEqual([]);
        }
      }),
      { numRuns: 300 },
    );
  });
});
