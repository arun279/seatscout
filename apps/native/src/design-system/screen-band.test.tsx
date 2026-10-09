import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { Dimensions, StyleSheet } from "react-native";
import { houseLights } from "../../test/lights.js";
import { definedUnder, drawnUnder, paintedWith } from "../../test/svg.js";
import type { Appearance } from "../theme.js";
import { OVER_THE_MAP, ScreenBand } from "./screen-band.js";

const hidden = { includeHiddenElements: true } as const;

const BAND = Dimensions.get("window").width;

const SPAN = 300;

const lights = async (appearance: Appearance) => {
  houseLights(appearance);
  await render(<ScreenBand />);
};

const overTheMap = async (appearance: Appearance) => {
  houseLights(appearance);
  await render(<ScreenBand drawing={OVER_THE_MAP} span={SPAN} />);
};

const alphasAcross = () => {
  const [edge] = drawnUnder("lights", "RNSVGLinearGradient");
  const stops: unknown = edge?.props["gradient"];
  return (Array.isArray(stops) ? stops : [])
    .filter((_, at) => at % 2 === 1)
    .map((colour) => (Number(colour) >>> 24) & 0xff);
};

const glowsFall = () =>
  drawnUnder("lights", "RNSVGFeOffset").map((offset) =>
    Number(offset.props["dy"]),
  );

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

describe("the light the screen gives off", () => {
  it("fades out at both ends of the screen and is lit between them", async () => {
    await lights("down");
    const alphas = alphasAcross();

    expect(alphas.at(0)).toBe(0);
    expect(alphas.at(-1)).toBe(0);
    expect(Math.max(...alphas)).toBeGreaterThan(0);
  });

  it("glows down into the room, never up into the band", async () => {
    await lights("down");
    const falls = glowsFall();

    expect(falls.length).toBeGreaterThan(0);
    expect(falls.every((dy) => dy > 0)).toBe(true);
  });
});

describe("the screen over the map", () => {
  it("names the screen, out of the way of assistive technology", async () => {
    await overTheMap("down");

    expect(screen.queryByText("Screen")).not.toBeOnTheScreen();
    expect(screen.getByText("Screen", hidden)).toBeOnTheScreen();
  });

  it("spans the width it is given, and lets no light fall onto the map", async () => {
    await overTheMap("down");

    expect(StyleSheet.flatten(drawnAt("screen-band")["style"]).width).toBe(
      SPAN,
    );
    expect(screen.queryByTestId("beam", hidden)).toBeNull();
  });

  it("hangs the lit screen across the middle of its span, narrower than the span", async () => {
    await overTheMap("down");
    const { left, width } = edge();

    expect(left + width / 2).toBeCloseTo(SPAN / 2, 5);
    expect(width).toBeGreaterThan(0);
    expect(width).toBeLessThan(SPAN);
  });

  it("hangs the unlit screen in the same place", async () => {
    await overTheMap("up");
    const bar = StyleSheet.flatten(drawnAt("screen")["style"]);

    expect(Number(bar.left) + Number(bar.width) / 2).toBeCloseTo(SPAN / 2, 5);
    expect(Number(bar.width)).toBeLessThan(SPAN);
  });

  it("lights the screen by its own gradient and glow, and glows down onto the map", async () => {
    await overTheMap("down");
    const [gradient] = definedUnder("lights", "RNSVGLinearGradient");
    const [glow] = definedUnder("lights", "RNSVGFilter");

    expect(drawnAt("screen")["fill"]).toEqual(paintedWith(gradient));
    expect(drawnAt("screen")["filter"]).toBe(glow);
    expect(alphasAcross().at(0)).toBe(0);
    expect(glowsFall().every((dy) => dy > 0)).toBe(true);
  });
});
