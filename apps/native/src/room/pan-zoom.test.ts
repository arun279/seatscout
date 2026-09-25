import { describe, expect, it } from "@jest/globals";
import { FITTED, type Frame } from "@seatscout/view-logic";
import {
  labelledAt,
  matrixOf,
  pannedBy,
  perUnitOf,
  revealedIn,
  zoomedBy,
} from "./pan-zoom.js";

const FRAME: Frame = { x: 100, y: 50, width: 500, height: 300, seatWidth: 18 };
const DRAWN = { width: 250, height: 150 };
const PER_UNIT = 0.5;
const MOST = 4;

describe("what a finger does to the drawing", () => {
  it("reads a drag in points and moves the drawing in the room's own units", () => {
    expect(
      pannedBy(
        { scale: 2, tx: -250, ty: -150 },
        { changeX: -50, changeY: -25 },
        PER_UNIT,
        FRAME,
      ),
    ).toEqual({ scale: 2, tx: -350, ty: -200 });
  });

  it("will not drag a fitted room, because none of it is off the edge", () => {
    expect(
      pannedBy(FITTED, { changeX: 40, changeY: 40 }, PER_UNIT, FRAME),
    ).toEqual(FITTED);
  });

  it("zooms about the point the fingers are spreading from", () => {
    expect(
      zoomedBy(
        FITTED,
        { scaleChange: 2, focalX: 125, focalY: 75 },
        PER_UNIT,
        FRAME,
        MOST,
      ),
    ).toEqual({ scale: 2, tx: -250, ty: -150 });
  });

  it("stops at the scale a Seat reaches the touch floor, and at the fit on the way out", () => {
    expect(
      zoomedBy(
        FITTED,
        { scaleChange: 100, focalX: 0, focalY: 0 },
        PER_UNIT,
        FRAME,
        MOST,
      ).scale,
    ).toBe(MOST);
    expect(
      zoomedBy(
        FITTED,
        { scaleChange: 0.25, focalX: 125, focalY: 75 },
        PER_UNIT,
        FRAME,
        MOST,
      ),
    ).toEqual(FITTED);
  });
});

describe("the frame the drawing is fitted into", () => {
  it("counts the points one room unit is drawn at", () => {
    expect(perUnitOf(FRAME, DRAWN)).toBe(PER_UNIT);
  });

  it("brings a Seat outside the view back in, measured from the frame's own corner", () => {
    expect(
      revealedIn(
        { scale: 2, tx: -250, ty: -150 },
        { x: 580, y: 60, width: 18, height: 18 },
        FRAME,
      ),
    ).toEqual({ scale: 2, tx: -496, ty: -20 });
  });

  it("leaves a Seat already in view where it is", () => {
    const held = { scale: 2, tx: -250, ty: -150 };

    expect(
      revealedIn(held, { x: 340, y: 190, width: 18, height: 18 }, FRAME),
    ).toEqual(held);
  });

  it("spells the drawing's transform as the matrix the group carries", () => {
    expect(matrixOf(FITTED)).toEqual([1, 0, 0, 1, 0, 0]);
    expect(matrixOf({ scale: 2, tx: -250, ty: -150 })).toEqual([
      2, 0, 0, 2, -250, -150,
    ]);
  });
});

describe("the label a Seat carries at the closest the map comes", () => {
  it("shows it only once a Seat has reached the touch floor", () => {
    expect(labelledAt(FITTED, FRAME, PER_UNIT, 44)).toBe(0);
    expect(labelledAt({ scale: 4, tx: 0, ty: 0 }, FRAME, PER_UNIT, 44)).toBe(0);
    expect(labelledAt({ scale: 5, tx: 0, ty: 0 }, FRAME, PER_UNIT, 44)).toBe(1);
  });

  it("shows it later where the platform asks for a wider floor", () => {
    expect(labelledAt({ scale: 5, tx: 0, ty: 0 }, FRAME, PER_UNIT, 48)).toBe(0);
    expect(labelledAt({ scale: 6, tx: 0, ty: 0 }, FRAME, PER_UNIT, 48)).toBe(1);
  });
});
