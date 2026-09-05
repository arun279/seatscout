import { describe, expect, it } from "vitest";
import { marksOf, targetAt } from "./plan.js";

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
    expect(targetAt({ cx: 17, cy: 25 })).toEqual({
      targetDepth: 0.5,
      targetLateral: -0.5,
    });
  });
});
