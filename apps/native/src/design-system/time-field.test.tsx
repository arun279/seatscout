import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Platform } from "react-native";
import {
  everyControlReachesTheTouchFloor,
  everyControlSaysWhatItIs,
} from "../../test/floors.js";
import { TimeField } from "./time-field.js";

const timing = async (clock?: string) => {
  const onClock = jest.fn<(clock: string | undefined) => void>();
  await render(
    <TimeField
      clear="Clear"
      clock={clock}
      label="From"
      onClock={onClock}
      words={clock === undefined ? "Any time" : "7:00p"}
    />,
  );
  return onClock;
};

describe("one end of the time window", () => {
  it("says any time until a time is picked, and offers nothing to clear", async () => {
    await timing();

    expect(
      screen.getByRole("button", { name: "From, Any time" }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Clear, From" })).toBeNull();
  });

  it("opens the platform's own time picker at the evening when no time is held", async () => {
    await timing();

    await fireEvent.press(
      screen.getByRole("button", { name: "From, Any time" }),
    );
    const picker = screen.getByTestId("time-picker");

    expect(picker.props["mode"]).toBe("time");
    expect([
      picker.props["value"].getHours(),
      picker.props["value"].getMinutes(),
    ]).toEqual([19, 0]);
    expect(picker.props["display"]).toBe(
      Platform.OS === "android" ? "default" : "spinner",
    );
  });

  it("opens it at the time it holds, and hands out the time picked on the clock a window is asked by", async () => {
    const clocked = await timing("21:30");

    await fireEvent.press(screen.getByRole("button", { name: "From, 7:00p" }));
    expect(screen.getByTestId("time-picker").props["value"].getHours()).toBe(
      21,
    );
    await fireEvent(
      screen.getByTestId("time-picker"),
      "change",
      { type: "set", nativeEvent: {} },
      new Date(2026, 8, 5, 18, 5),
    );

    expect(clocked).toHaveBeenCalledWith("18:05");
  });

  it("lets a held time be cleared back to any time", async () => {
    const clocked = await timing("21:30");

    await fireEvent.press(screen.getByRole("button", { name: "Clear, From" }));

    expect(clocked).toHaveBeenCalledWith(undefined);
  });

  it("reaches the platform's touch floor and names both its controls", async () => {
    await timing("21:30");

    everyControlReachesTheTouchFloor();
    everyControlSaysWhatItIs();
  });
});
