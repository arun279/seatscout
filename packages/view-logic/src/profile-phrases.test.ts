import { REFERENCE } from "@seatscout/client";
import { describe, expect, it } from "vitest";
import {
  aimOf,
  DEPTH,
  depthOf,
  LATERAL,
  mindOf,
  SITTING,
  WEIGHT,
  WEIGHTS,
} from "./profile-phrases.js";

describe("the words a Seat Profile is set in", () => {
  it("says how far back as a share of the room", () => {
    expect(depthOf(REFERENCE.targetDepth)).toBe("67% of the way back");
    expect(depthOf(0)).toBe("0% of the way back");
  });

  it("says the centreline, or how far to which side of the house", () => {
    expect(aimOf(0)).toBe("on the centreline");
    expect(aimOf(-0.5)).toBe("50% of the way to house left");
    expect(aimOf(0.25)).toBe("25% of the way to house right");
  });

  it("says how much a penalty is minded, from not at all to avoided", () => {
    expect(mindOf(0)).toBe("Don't mind");
    expect(mindOf(0.05)).toBe("A little");
    expect(mindOf(0.95)).toBe("A little");
    expect(mindOf(1)).toBe("Avoid");
    expect(mindOf(2)).toBe("Avoid");
  });

  it("names the five penalties by what a person minds, in the order the ranking weighs them", () => {
    expect(WEIGHTS).toEqual([
      { field: "depthWeight", label: "Missing your spot" },
      { field: "offAxisWeight", label: "Watching at an angle" },
      { field: "frontBandWeight", label: "The front rows" },
      { field: "wallBandWeight", label: "A wall, or the back row" },
      { field: "podDividerWeight", label: "A console between seats" },
    ]);
  });

  it("sets each control's reach and step", () => {
    expect([DEPTH, LATERAL, WEIGHT]).toEqual([
      { min: 0, max: 1, step: 0.01 },
      { min: -1, max: 1, step: 0.01 },
      { min: 0, max: 2, step: 0.05 },
    ]);
  });

  it("says something for every line of the section", () => {
    for (const line of [
      SITTING.heading,
      SITTING.drag,
      SITTING.depth,
      SITTING.lateral,
      SITTING.reference,
      SITTING.referenceNote,
      SITTING.minding,
      ...SITTING.depthEnds,
      ...SITTING.lateralEnds,
      ...SITTING.mindEnds,
    ])
      expect(line.trim()).not.toBe("");
  });
});
