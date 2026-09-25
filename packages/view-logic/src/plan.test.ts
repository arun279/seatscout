import { describe, expect, it } from "vitest";
import { aimAt, marksOf, SEAT_PICKER } from "./plan.js";

describe("the marks a card's room plan is drawn from", () => {
  it("spreads the rows from y 9 at the front to y 41 at the back, and the seats from x 2 at house left to x 62 at house right", () => {
    const marks = marksOf(
      [
        { depth: 0, runs: [{ from: -1, to: 1 }] },
        {
          depth: 1,
          runs: [
            { from: -1, to: -0.5 },
            { from: 0.5, to: 1 },
          ],
        },
      ],
      { depth: 0.5, lateral: 0, seatsOffCentre: 0 },
      { targetDepth: 0.67, targetLateral: 0 },
    );

    expect(marks.rows).toEqual([
      { x1: 2, x2: 62, y: 9 },
      { x1: 2, x2: 17, y: 41 },
      { x1: 47, x2: 62, y: 41 },
    ]);
    expect(marks.pair).toEqual({ cx: 32, cy: 25 });
    expect(marks.target).toEqual({ cx: 32, cy: 30.44 });
  });

  it("recovers both the depth and lateral target from a mark off centre", () => {
    expect(aimAt({ cx: 17, cy: 25 })).toEqual({
      targetDepth: 0.5,
      targetLateral: -0.5,
    });
  });

  it("holds an aim dragged past the drawing to its edges, in hundredths", () => {
    expect(aimAt({ cx: -10, cy: 100 })).toEqual({
      targetDepth: 1,
      targetLateral: -1,
    });
    expect(aimAt({ cx: 80, cy: 0 })).toEqual({
      targetDepth: 0,
      targetLateral: 1,
    });
    expect(aimAt({ cx: 32.1, cy: 30.4 })).toEqual({
      targetDepth: 0.67,
      targetLateral: 0,
    });
  });
});

describe("the room a Seat Profile is drawn in", () => {
  it("draws ten rows, front to back, each wider than the one before it", () => {
    expect(SEAT_PICKER.map((row) => row.depth)).toEqual(
      Array.from({ length: 10 }, (_, row) => row / 9),
    );
    expect(SEAT_PICKER[0]?.runs).toEqual([{ from: -0.66, to: 0.66 }]);
    expect(SEAT_PICKER[9]?.runs).toEqual([{ from: -1, to: 1 }]);
    expect(SEAT_PICKER[3]?.runs[0]?.to).toBeCloseTo(0.66 + 0.34 / 3);
  });
});
