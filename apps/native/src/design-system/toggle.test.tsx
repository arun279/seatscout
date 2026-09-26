import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { selectionAsync } from "expo-haptics";
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
      note="Wheelchair seats stay out of ordinary results."
    />,
  );
  return onToggle;
};

const toggle = () => screen.getByRole("switch", { name: "Accessible seating" });

const track = () =>
  screen.getByTestId("toggle-switch", { includeHiddenElements: true });

describe("a term that is on or off", () => {
  (Platform.OS === "ios" ? it : it.skip)(
    "draws the platform's switch, holding whether it is on",
    async () => {
      await toggling(true);

      expect(track().props["value"]).toBe(true);
    },
  );

  it("is one switch to a screen reader, its whole row, named and checked", async () => {
    await toggling(true);

    expect(toggle()).toBeChecked();
    expect(screen.queryAllByRole("switch")).toHaveLength(1);
  });

  it("hands out the state its switch was moved to, with a selection tick", async () => {
    const toggled = await toggling(false);

    await fireEvent(track(), "valueChange", true);

    expect(toggled).toHaveBeenCalledWith(true);
    expect(selectionAsync).toHaveBeenCalledTimes(1);
  });

  it("turns over when its row is pressed anywhere, as far as the touch floor reaches", async () => {
    const toggled = await toggling(true);

    await fireEvent.press(toggle());

    expect(toggled).toHaveBeenCalledWith(false);
  });

  it("says what the term does beneath it", async () => {
    await toggling(false);

    expect(
      screen.getByText("Wheelchair seats stay out of ordinary results."),
    ).toBeOnTheScreen();
  });

  it("sits inside the section inset the rest of the sheet uses", async () => {
    await toggling(false);

    expect(
      StyleSheet.flatten(
        screen.getByTestId("toggle-row").parent?.props["style"],
      ),
    ).toMatchObject({ paddingHorizontal: 18, paddingTop: 14 });
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

      expect(track().props).toMatchObject({
        onTintColor: "#c01242",
        tintColor: "#202333",
      });
    },
  );
});
