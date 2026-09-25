import { describe, expect, it } from "@jest/globals";
import { REFERENCE } from "@seatscout/client";
import { fireEvent, screen } from "@testing-library/react-native";
import { asking, NEAR, submit } from "../../test/ask.js";

const FRONT_ROW = { ...REFERENCE, targetDepth: 0 };

const profileHandedOut = (found: Awaited<ReturnType<typeof asking>>["found"]) =>
  found.mock.calls.at(-1)?.[1];

const slide = async (name: string, value: number) => {
  await fireEvent(screen.getByLabelText(name), "valueChange", value);
};

const picker = () => screen.getByTestId("seat-picker");

const laidOut = async (width: number) => {
  await fireEvent(picker(), "layout", {
    nativeEvent: { layout: { width, height: (width * 46) / 64 } },
  });
};

const touched = (locationX: number, locationY: number) => ({
  nativeEvent: { locationX, locationY },
});

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

    await fireEvent(picker(), "responderGrant", touched(160, 45));
    await fireEvent(picker(), "responderMove", touched(85, 125));
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

    await fireEvent(picker(), "responderGrant", touched(170, 250));
    await submit();

    expect(profileHandedOut(found)).toEqual({
      ...REFERENCE,
      targetDepth: 0.5,
      targetLateral: -0.5,
    });
  });

  it("keeps hold of a drag rather than handing it to the scroll", async () => {
    await asking({ terms: NEAR });
    const held = picker().props;

    expect(held["onStartShouldSetResponder"]()).toBe(true);
    expect(held["onMoveShouldSetResponder"]()).toBe(true);
    expect(held["onResponderTerminationRequest"]()).toBe(false);
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
