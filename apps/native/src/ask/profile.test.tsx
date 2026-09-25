import { describe, expect, it } from "@jest/globals";
import { REFERENCE } from "@seatscout/client";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { asking, NEAR, submit } from "../../test/ask.js";
import { TOUCH_FLOOR } from "../design-system/touch.js";

const FRONT_ROW = { ...REFERENCE, targetDepth: 0 };

const profileHandedOut = (found: Awaited<ReturnType<typeof asking>>["found"]) =>
  found.mock.calls.at(-1)?.[1];

const slide = async (name: string, value: number) => {
  await fireEvent(screen.getByLabelText(name), "valueChange", value);
};

const picker = () => screen.getByTestId("seat-picker");

const touched = (locationX: number, locationY: number) => ({
  nativeEvent: { locationX, locationY },
});

const respond = async (handler: string, event?: object) => {
  await act(() => picker().props[handler](event));
};

const laidOut = async (width: number) => {
  await respond("onLayout", {
    nativeEvent: { layout: { width, height: (width * 46) / 64 } },
  });
};

describe("where you sit, in the Ask sheet", () => {
  it("opens on the Profile it was given, saying each value in words", async () => {
    await asking({ terms: NEAR });

    expect(screen.getByText("67% of the way back")).toBeOnTheScreen();
    expect(screen.getByText("on the centreline")).toBeOnTheScreen();
    expect(screen.getByLabelText("How far back").props["value"]).toBe(
      REFERENCE.targetDepth,
    );
  });

  it("hands out the depth and side slid to with the search", async () => {
    const { found } = await asking({ terms: NEAR });

    await slide("How far back", 0.2);
    await slide("Left or right", -0.5);
    await submit();

    expect(profileHandedOut(found)).toEqual({
      ...REFERENCE,
      targetDepth: 0.2,
      targetLateral: -0.5,
    });
    expect(screen.getByText("20% of the way back")).toBeOnTheScreen();
    expect(screen.getByText("50% of the way to house left")).toBeOnTheScreen();
  });

  it("hands out each weight slid to, and says how much it is minded", async () => {
    const { found } = await asking({ terms: NEAR });

    await slide("The front rows", 1.5);
    await slide("A console between seats", 0);
    await submit();

    expect(profileHandedOut(found)).toEqual({
      ...REFERENCE,
      frontBandWeight: 1.5,
      podDividerWeight: 0,
    });
    expect(screen.getAllByText("Don't mind")).toHaveLength(2);
  });

  it("moves the target to where the room drawing is touched and dragged", async () => {
    const { found } = await asking({ terms: NEAR });
    await laidOut(320);

    await respond("onResponderGrant", touched(160, 45));
    await respond("onResponderMove", touched(85, 125));
    await submit();

    expect(profileHandedOut(found)).toEqual({
      ...REFERENCE,
      targetDepth: 0.5,
      targetLateral: -0.5,
    });
  });

  it("takes the whole drawing as the room, whatever width it is laid out at", async () => {
    const { found } = await asking({ terms: NEAR });
    await laidOut(640);

    await respond("onResponderGrant", touched(170, 250));
    await submit();

    expect(profileHandedOut(found)).toEqual({
      ...REFERENCE,
      targetDepth: 0.5,
      targetLateral: -0.5,
    });
  });

  it("takes a touch that lands on the dot, and leaves one anywhere else to the scroll", async () => {
    await asking({ terms: NEAR });
    await laidOut(320);
    const takes = (x: number, y: number) =>
      picker().props["onStartShouldSetResponder"](touched(x, y));

    const dot = { x: 32 * 5, y: 30.44 * 5 };

    expect(takes(dot.x, dot.y)).toBe(true);
    expect(takes(dot.x + TOUCH_FLOOR, dot.y)).toBe(true);
    expect(takes(dot.x, dot.y + TOUCH_FLOOR + 1)).toBe(false);
    expect(takes(40, 40)).toBe(false);
    expect(picker().props["onResponderTerminationRequest"]()).toBe(false);
  });

  it("holds the sheet still while a finger is on the drawing, and lets it scroll again on release", async () => {
    await asking({ terms: NEAR });
    const scrolls = () =>
      screen.getByTestId("sheet-scroll").props["scrollEnabled"];

    await respond("onResponderGrant", touched(0, 0));
    expect(scrolls()).toBe(false);

    await respond("onResponderRelease");
    expect(scrolls()).toBe(true);

    await respond("onResponderGrant", touched(0, 0));
    await respond("onResponderTerminate");
    expect(scrolls()).toBe(true);
  });

  it("draws the faint Reference circle only once the Profile has left it", async () => {
    const was = { includeHiddenElements: true };
    await asking({ terms: NEAR });
    expect(screen.queryByTestId("was", was)).toBeNull();

    await slide("How far back", 0.2);

    expect(screen.getByTestId("was", was).props).toMatchObject({
      cx: 32,
      cy: 30.44,
    });
  });

  it("goes back to Reference in one press, and offers no such press at Reference", async () => {
    const { found } = await asking({ terms: NEAR, profile: FRONT_ROW });

    await fireEvent.press(
      screen.getByRole("button", { name: "Back to Reference" }),
    );
    await submit();

    expect(profileHandedOut(found)).toEqual(REFERENCE);
    expect(
      screen.queryByRole("button", { name: "Back to Reference" }),
    ).toBeNull();
    expect(screen.getByText("Back to Reference")).toBeTruthy();
  });
});
