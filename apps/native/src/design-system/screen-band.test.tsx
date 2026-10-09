import { describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { Dimensions, StyleSheet } from "react-native";
import { houseLights } from "../../test/lights.js";
import { definedUnder, paintedWith } from "../../test/svg.js";
import type { Appearance } from "../theme.js";
import { ScreenBand } from "./screen-band.js";

const hidden = { includeHiddenElements: true } as const;

const BAND = Dimensions.get("window").width;

const lights = async (appearance: Appearance) => {
  houseLights(appearance);
  await render(<ScreenBand />);
};

const drawnAt = (testID: string) => screen.getByTestId(testID, hidden).props;

const edge = () => {
  const rect = drawnAt("screen");
  return { left: Number(rect["x"]), width: Number(rect["width"]) };
};

const NOWHERE = { x: 0, y: 0 };

const cone = () => {
  const drawn = (String(drawnAt("beam")["d"]).match(/-?[\d.]+/g) ?? []).map(
    Number,
  );
  const corners = Array.from({ length: drawn.length / 2 }, (_, at) => ({
    x: drawn[at * 2] ?? 0,
    y: drawn[at * 2 + 1] ?? 0,
  }));
  return {
    corners: corners.length,
    nearLeft: corners[0] ?? NOWHERE,
    nearRight: corners[1] ?? NOWHERE,
    farRight: corners[2] ?? NOWHERE,
    farLeft: corners[3] ?? NOWHERE,
  };
};

describe("the screen band", () => {
  it("names the house above the room, out of the way of assistive technology", async () => {
    await lights("down");

    expect(screen.queryByText("Seatscout")).not.toBeOnTheScreen();
    expect(screen.getByText("Seatscout", hidden)).toBeOnTheScreen();
  });

  it("lets light fall into the room with the house lights down", async () => {
    await lights("down");

    expect(screen.getByTestId("beam", hidden)).toBeOnTheScreen();
  });

  it("lights the screen and the beam by the gradients and the glow the band draws itself", async () => {
    await lights("down");
    const [edge, fall] = definedUnder("lights", "RNSVGLinearGradient");
    const [glow] = definedUnder("lights", "RNSVGFilter");

    expect(drawnAt("screen")["filter"]).toBe(glow);
    expect(drawnAt("screen")["fill"]).toEqual(paintedWith(edge));
    expect(drawnAt("beam")["fill"]).toEqual(paintedWith(fall));
    expect(new Set([edge, fall, glow]).size).toBe(3);
  });

  it("lets none fall with the house lights up, because the projector is off", async () => {
    await lights("up");

    expect(screen.queryByTestId("beam", hidden)).toBeNull();
  });

  it("hangs the lit screen across the middle of the band, narrower than the room", async () => {
    await lights("down");
    const { left, width } = edge();

    expect(left + width / 2).toBeCloseTo(BAND / 2, 5);
    expect(width).toBeGreaterThan(0);
    expect(width).toBeLessThan(BAND);
  });

  it("hangs the unlit screen in the same place, because only the light changes", async () => {
    await lights("up");
    const bar = StyleSheet.flatten(drawnAt("screen")["style"]);

    expect(Number(bar.left) + Number(bar.width) / 2).toBeCloseTo(BAND / 2, 5);
    expect(Number(bar.width)).toBeLessThan(BAND);
    expect(String(bar.backgroundColor)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("widens the light as it falls, which is what a beam does", async () => {
    await lights("down");
    const { corners, nearLeft, nearRight, farRight, farLeft } = cone();

    expect(corners).toBe(4);
    expect(nearRight.x).toBeGreaterThan(nearLeft.x);
    expect(farRight.x).toBeGreaterThan(nearRight.x);
    expect(farLeft.x).toBeLessThan(nearLeft.x);
    expect(farLeft.y).toBeGreaterThan(nearLeft.y);
  });

  it("throws the light down the middle of the room and inside its walls", async () => {
    await lights("down");
    const { farRight, farLeft } = cone();

    expect(farLeft.x + (farRight.x - farLeft.x) / 2).toBeCloseTo(BAND / 2, 5);
    expect(farLeft.x).toBeGreaterThan(0);
    expect(farRight.x).toBeLessThan(BAND);
  });

  it("draws on a surface tall enough to hold the light it throws", async () => {
    await lights("down");
    const { farRight } = cone();

    expect(Number(drawnAt("lights")["height"])).toBeGreaterThanOrEqual(
      farRight.y,
    );
  });
});

describe("the screen band in a pane or at the largest text", () => {
  it("hangs the screen across the span it is given rather than the window", async () => {
    houseLights("up");
    await render(<ScreenBand span={400} />);
    const bar = StyleSheet.flatten(drawnAt("screen")["style"]);

    expect([bar.left, bar.width]).toEqual([76, 248]);
  });

  it.each<[number, boolean]>([
    [2, true],
    [2.01, false],
  ])(
    "is drawn at a text size of %s times only while that is no more than twice, first in the cut order",
    async (fontScale, drawn) => {
      const sized = jest
        .spyOn(Dimensions, "get")
        .mockReturnValue({ fontScale, height: 874, scale: 3, width: 402 });
      houseLights("up");
      await render(<ScreenBand />);
      sized.mockRestore();

      expect(screen.queryByText("Seatscout", hidden) !== null).toBe(drawn);
    },
  );
});
