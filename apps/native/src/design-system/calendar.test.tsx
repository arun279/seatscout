import { describe, expect, it, jest } from "@jest/globals";
import type { Mark } from "@seatscout/view-logic";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { selectionAsync } from "expo-haptics";
import { StyleSheet } from "react-native";
import { houseLights } from "../../test/lights.js";
import { themeFor } from "../theme.js";
import { Calendar } from "./calendar.js";

const TODAY = "2026-09-19";

const marking =
  (picked: readonly string[], between: readonly string[] = []) =>
  (date: string): Mark =>
    picked.includes(date)
      ? "picked"
      : between.includes(date)
        ? "between"
        : "none";

const drawn = async (
  mark: (date: string) => Mark,
  onDay?: (date: string) => void,
) => {
  await render(
    <Calendar mark={mark} onDay={onDay} opensOn={TODAY} today={TODAY} />,
  );
};

const day = (name: string) => screen.getByLabelText(name);

const fillOf = (name: string) =>
  StyleSheet.flatten(day(name).props["style"])["backgroundColor"];

describe("the calendar under the when term", () => {
  it("opens on the month of the day it is given, and names it", async () => {
    await drawn(marking([TODAY]));

    expect(screen.getByText("September 2026")).toBeOnTheScreen();
    expect(day("Today, Saturday 19 September")).toBeOnTheScreen();
    expect(day("Monday 21 September")).toBeOnTheScreen();
  });

  it("says which days are picked when a day can be pressed", async () => {
    await drawn(marking(["2026-09-22"]), () => undefined);

    expect(day("Tuesday 22 September")).toBeSelected();
    expect(day("Wednesday 23 September")).not.toBeSelected();
  });

  it("hands out the day that is pressed, and feels it", async () => {
    const onDay = jest.fn<(date: string) => void>();
    await drawn(marking([TODAY]), onDay);

    await fireEvent.press(day("Tuesday 22 September"));

    expect(onDay).toHaveBeenCalledWith("2026-09-22");
    expect(selectionAsync).toHaveBeenCalled();
  });

  it("lets no day before today be pressed", async () => {
    await drawn(marking([TODAY]), () => undefined);

    expect(day("Friday 18 September")).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Friday 18 September" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Today, Saturday 19 September" }),
    ).toBeOnTheScreen();
  });

  it("fills the days picked, and shades the days between a range's ends apart from them", async () => {
    houseLights("down");
    await drawn(
      marking(["2026-09-21", "2026-09-24"], ["2026-09-22", "2026-09-23"]),
    );
    const { colours } = themeFor("down");

    expect(fillOf("Monday 21 September")).toBe(colours.chosen);
    expect(fillOf("Tuesday 22 September")).toBe(colours.beam);
    expect(fillOf("Friday 25 September")).toBeUndefined();
  });

  it("moves between months, and never back past the month of today", async () => {
    await drawn(marking([TODAY]));

    expect(
      screen.getByRole("button", { name: "Previous month" }),
    ).toBeDisabled();
    await fireEvent.press(screen.getByRole("button", { name: "Next month" }));

    expect(screen.getByText("October 2026")).toBeOnTheScreen();
    expect(day("Thursday 1 October")).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole("button", { name: "Previous month" }),
    );
    expect(screen.getByText("September 2026")).toBeOnTheScreen();
  });

  it("presses nothing when it is only showing the days", async () => {
    await drawn(marking([TODAY]));

    expect(day("Monday 21 September")).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Monday 21 September" }),
    ).toBeNull();
  });

  it("draws with the house lights up as well", async () => {
    houseLights("up");
    await drawn(marking(["2026-09-21"]));

    expect(fillOf("Monday 21 September")).toBe(themeFor("up").colours.chosen);
  });
});
