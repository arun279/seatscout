import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Platform, StyleSheet } from "react-native";
import { houseLights } from "../../test/lights.js";
import { Toggle } from "./toggle.js";
import { TOUCH_FLOOR } from "./touch.js";

const toggling = async (on: boolean) => {
  const onToggle = jest.fn<(on: boolean) => void>();
  await render(
    <Toggle
      label="Accessible seating"
      on={on}
      onToggle={onToggle}
      said="Wheelchair seats stay out of ordinary results."
    />,
  );
  return onToggle;
};

const toggle = () => screen.getByLabelText("Accessible seating");

describe("a term that is on or off", () => {
  it("is the platform's switch, named, saying whether it is on", async () => {
    await toggling(true);

    expect(toggle().props["accessibilityState"]).toEqual({ checked: true });
  });

  it("hands out the state it was switched to", async () => {
    const toggled = await toggling(false);

    await fireEvent(toggle(), "valueChange", true);

    expect(toggled).toHaveBeenCalledWith(true);
  });

  it("says what the term does beneath it", async () => {
    await toggling(false);

    expect(
      screen.getByText("Wheelchair seats stay out of ordinary results."),
    ).toBeOnTheScreen();
  });

  it("stands its row as tall as the touch floor", async () => {
    await toggling(false);

    expect(
      StyleSheet.flatten(screen.getByTestId("toggle-row").props["style"])
        .minHeight,
    ).toBe(TOUCH_FLOOR);
  });

  (Platform.OS === "ios" ? it : it.skip)(
    "lights its track in velvet when it is on, on the raised ground when it is off",
    async () => {
      houseLights("down");
      await toggling(true);

      expect(toggle().props).toMatchObject({
        onTintColor: "#c01242",
        tintColor: "#202333",
      });
    },
  );
});
