import { describe, expect, it } from "@jest/globals";
import {
  FITTED,
  type Frame,
  frameOf,
  mostZoomFor,
} from "@seatscout/view-logic";
import {
  ANGELIKA_5,
  HOOKY_ADDISON,
  LAKE_HIGHLANDS_1,
  openedRooms,
  STRIKE_AND_REEL_1,
  VILLAGE_1,
  WEST_PLANO_28,
} from "@seatscout/view-logic/testing";
import {
  labelledAt,
  matrixOf,
  pannedBy,
  perUnitOf,
  zoomedBy,
} from "./pan-zoom.js";

const FRAME: Frame = { x: 100, y: 50, width: 500, height: 300, seatWidth: 18 };
const DRAWN = { width: 250, height: 150 };
const PER_UNIT = 0.5;
const MOST = 4;
const PHONE = 354;

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

  it("spells the drawing's transform as the matrix the group carries", () => {
    expect(matrixOf(FITTED)).toEqual([1, 0, 0, 1, 0, 0]);
    expect(matrixOf({ scale: 2, tx: -250, ty: -150 })).toEqual([
      2, 0, 0, 2, -250, -150,
    ]);
  });
});

describe("the label a Seat carries at the closest the map comes", () => {
  it("shows it at the closest zoom in every captured room, on either platform's touch floor, and not a step before", async () => {
    const rooms = await openedRooms(undefined, [
      VILLAGE_1,
      WEST_PLANO_28,
      HOOKY_ADDISON,
      ANGELIKA_5,
      LAKE_HIGHLANDS_1,
      STRIKE_AND_REEL_1,
    ]);

    for (const { auditorium } of rooms) {
      const frame = frameOf(auditorium);
      for (const floor of [44, 48]) {
        const most = mostZoomFor(frame.seatWidth, frame.width, PHONE, floor);
        const closest = zoomedBy(
          FITTED,
          { scaleChange: 100, focalX: 0, focalY: 0 },
          perUnitOf(frame, { width: PHONE, height: 0 }),
          frame,
          most,
        );

        expect(labelledAt(closest, most)).toBe(1);
        expect(
          labelledAt({ ...closest, scale: closest.scale * 0.99 }, most),
        ).toBe(0);
      }
    }
  });
});
