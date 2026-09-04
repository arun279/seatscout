import { describe, expect, it } from "vitest";
import {
  FITTED,
  mostZoomFor,
  panned,
  pinched,
  revealed,
  transformOf,
  zoomed,
} from "./gesture.js";

const ROOM = { width: 500, height: 300 };
const MOST = 3.6;

describe("panning and zooming the room", () => {
  it("cannot be panned while it fits, because there is nothing off the edge", () => {
    expect(panned(FITTED, 40, 20, ROOM)).toEqual(FITTED);
    expect(panned(FITTED, -40, -20, ROOM)).toEqual(FITTED);
  });

  it("zooms about the point under the pointer, so that point stays put", () => {
    expect(zoomed(FITTED, 2, { x: 250, y: 150 }, ROOM, MOST)).toEqual({
      k: 2,
      tx: -250,
      ty: -150,
    });
    expect(zoomed(FITTED, 2, { x: 0, y: 0 }, ROOM, MOST)).toEqual({
      k: 2,
      tx: 0,
      ty: 0,
    });
  });

  it("stops zooming in where a Seat would reach the size of a tap target, and stops zooming out at the fit", () => {
    expect(zoomed(FITTED, 100, { x: 0, y: 0 }, ROOM, MOST).k).toBe(3.6);
    expect(zoomed(FITTED, 0.5, { x: 250, y: 150 }, ROOM, MOST)).toEqual(FITTED);
  });

  it("pans a zoomed room no further than its own edge", () => {
    const halfway = { k: 2, tx: -250, ty: -150 };

    expect(panned(halfway, 300, 0, ROOM)).toEqual({ k: 2, tx: 0, ty: -150 });
    expect(panned(halfway, -500, 0, ROOM)).toEqual({
      k: 2,
      tx: -500,
      ty: -150,
    });
    expect(panned(halfway, 0, 400, ROOM)).toEqual({ k: 2, tx: -250, ty: 0 });
    expect(panned(halfway, 0, -400, ROOM)).toEqual({
      k: 2,
      tx: -250,
      ty: -300,
    });
  });

  it("reads a pinch as a pan by the midpoint and a zoom by the spread, about the fingers", () => {
    expect(
      pinched(
        FITTED,
        [
          { x: 100, y: 100 },
          { x: 200, y: 100 },
        ],
        [
          { x: 100, y: 100 },
          { x: 300, y: 100 },
        ],
        ROOM,
        MOST,
      ),
    ).toEqual({ k: 2, tx: -200, ty: -100 });
  });

  it("brings a Seat outside the view back inside it, and leaves one already in view alone", () => {
    const view = { k: 2, tx: -250, ty: -150 };

    expect(
      revealed(view, { x: 480, y: 10, width: 18, height: 18 }, ROOM),
    ).toEqual({
      k: 2,
      tx: -496,
      ty: -20,
    });
    expect(
      revealed(view, { x: 240, y: 140, width: 18, height: 18 }, ROOM),
    ).toEqual(view);
  });

  it("derives the most zoom from the tap target a Seat has to reach", () => {
    expect(mostZoomFor(18, 500, 340)).toBeCloseTo(3.595, 3);
    expect(mostZoomFor(82.6, 1189.1, 340)).toBeCloseTo(1.863, 3);
    expect(mostZoomFor(82.6, 1189.1, 1000)).toBe(1);
  });

  it("spells the transform the wrapping group carries", () => {
    expect(transformOf(FITTED)).toBe("translate(0 0) scale(1)");
    expect(transformOf({ k: 2, tx: -250, ty: -150 })).toBe(
      "translate(-250 -150) scale(2)",
    );
  });
});
