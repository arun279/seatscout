import { describe, expect, it } from "@jest/globals";
import { contrastOf } from "../test/contrast.js";
import {
  type Appearance,
  appearanceOf,
  type Palette,
  themeFor,
} from "./theme.js";

const APPEARANCES: readonly Appearance[] = ["down", "up"];

const READ_AT_LENGTH: readonly (keyof Palette)[] = [
  "silver",
  "silverDim",
  "silverFaint",
  "velvetLit",
  "beam",
  "beamDim",
];

describe("which house lights the system asked for", () => {
  it("puts the house lights up when the system is light", () => {
    expect(appearanceOf("light")).toBe("up");
  });

  it("puts them down when the system is dark", () => {
    expect(appearanceOf("dark")).toBe("down");
  });

  it("puts them down when the system says nothing, which is the direction's own room", () => {
    expect(appearanceOf("unspecified")).toBe("down");
  });
});

describe("the reading that measures a contrast ratio", () => {
  it("reads 21 between black and white, which is the widest ratio there is", () => {
    expect(contrastOf("#000000", "#ffffff")).toBeCloseTo(21, 2);
  });

  it("reads 1 between a colour and itself", () => {
    expect(contrastOf("#c01242", "#c01242")).toBeCloseTo(1, 5);
  });
});

describe("every appearance carries its own room past the standard", () => {
  for (const appearance of APPEARANCES) {
    it(`reads text against the ground at 4.5 to 1 or better with the lights ${appearance}`, () => {
      const { colours } = themeFor(appearance);

      for (const token of READ_AT_LENGTH)
        expect(
          contrastOf(colours[token], colours.house),
        ).toBeGreaterThanOrEqual(4.5);
    });

    it(`separates both seat marks from the map's ground at 3 to 1 with the lights ${appearance}`, () => {
      const { colours } = themeFor(appearance);

      expect(
        contrastOf(colours.seatFree, colours.houseDeep),
      ).toBeGreaterThanOrEqual(3);
      expect(
        contrastOf(colours.seatGone, colours.houseDeep),
      ).toBeGreaterThanOrEqual(3);
    });

    it(`fills a chosen control apart from the ground and the raised controls beside it at 3 to 1, and reads its words at 4.5 to 1, with the lights ${appearance}`, () => {
      const { colours } = themeFor(appearance);

      for (const around of [colours.house, colours.raised])
        expect(contrastOf(colours.chosen, around)).toBeGreaterThanOrEqual(3);
      expect(
        contrastOf(colours.onChosen, colours.chosen),
      ).toBeGreaterThanOrEqual(4.5);
    });

    it(`separates the console tick from the map's ground at 3 to 1 with the lights ${appearance}`, () => {
      const { colours } = themeFor(appearance);

      expect(
        contrastOf(colours.seatTick, colours.houseDeep),
      ).toBeGreaterThanOrEqual(3);
    });

    it(`keeps seats for sale the more present mark with the lights ${appearance}`, () => {
      const { colours } = themeFor(appearance);

      expect(contrastOf(colours.seatFree, colours.houseDeep)).toBeGreaterThan(
        contrastOf(colours.seatGone, colours.houseDeep),
      );
    });
  }
});
