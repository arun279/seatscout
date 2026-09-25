import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Platform } from "react-native";
import { everyControlReachesTheTouchFloor } from "../../test/floors.js";
import { houseLights } from "../../test/lights.js";
import type { Appearance } from "../theme.js";
import { DateField } from "./date-field.js";

const FIELD = "When, Sat 26 Sep";

const showing = async (
  onDate = jest.fn<(date: string) => void>(),
  appearance: Appearance = "down",
) => {
  houseLights(appearance);
  await render(
    <DateField
      date="2026-09-26"
      label="When"
      onDate={onDate}
      words="Sat 26 Sep"
    />,
  );
  return onDate;
};

const picking = async (
  onDate = jest.fn<(date: string) => void>(),
  appearance: Appearance = "down",
) => {
  await showing(onDate, appearance);
  await fireEvent.press(screen.getByRole("button", { name: FIELD }));
  return onDate;
};

const set = (at: Date) => [{ type: "set", nativeEvent: {} }, at] as const;

describe("the date a query is for", () => {
  it("reads the day it was given, under the name of the term", async () => {
    await showing();

    expect(screen.getByRole("button", { name: FIELD })).toBeOnTheScreen();
    expect(screen.getByText("Sat 26 Sep")).toBeOnTheScreen();
  });

  it("keeps the platform's own picker out of the way until it is asked for", async () => {
    await showing();

    expect(screen.queryByTestId("date-picker")).toBeNull();
  });

  it("opens the platform's own picker on the day it already holds, in the platform's own shape", async () => {
    await picking();
    const picker = screen.getByTestId("date-picker");

    expect(picker.props["value"]).toEqual(new Date(2026, 8, 26));
    expect(picker.props["mode"]).toBe("date");
    expect(picker.props["display"]).toBe(
      Platform.OS === "android" ? "default" : "spinner",
    );
  });

  it("opens it under the house lights the rest of the app is under", async () => {
    await picking(undefined, "up");

    expect(screen.getByTestId("date-picker").props["themeVariant"]).toBe(
      "light",
    );
  });

  it("opens it dark with the house lights down", async () => {
    await picking();

    expect(screen.getByTestId("date-picker").props["themeVariant"]).toBe(
      "dark",
    );
  });

  it("takes the day that was picked as the date of the query", async () => {
    const dated = await picking();

    await fireEvent(
      screen.getByTestId("date-picker"),
      "change",
      ...set(new Date(2026, 8, 5)),
    );

    expect(dated).toHaveBeenCalledWith("2026-09-05");
  });

  it("closes the picker once a day is picked", async () => {
    await picking();

    await fireEvent(
      screen.getByTestId("date-picker"),
      "change",
      ...set(new Date(2026, 8, 5)),
    );

    expect(screen.queryByTestId("date-picker")).toBeNull();
  });

  it("changes nothing when the picker is dismissed, whatever day it was showing", async () => {
    const dated = await picking();

    await fireEvent(
      screen.getByTestId("date-picker"),
      "change",
      { type: "dismissed", nativeEvent: {} },
      new Date(2026, 8, 5),
    );

    expect(dated).not.toHaveBeenCalled();
    expect(screen.queryByTestId("date-picker")).toBeNull();
  });

  it("changes nothing when a day was set but none was carried", async () => {
    const dated = await picking();

    await fireEvent(screen.getByTestId("date-picker"), "change", {
      type: "set",
      nativeEvent: {},
    });

    expect(dated).not.toHaveBeenCalled();
  });

  it("reaches the platform's touch floor", async () => {
    await showing();

    everyControlReachesTheTouchFloor();
  });
});
