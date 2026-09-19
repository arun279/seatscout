import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Platform, StyleSheet } from "react-native";
import { everyControlReachesTheTouchFloor } from "../../test/floors.js";
import { Stepper } from "./stepper.js";

const stepping = async (count: number, onCount = jest.fn()) => {
  await render(
    <Stepper
      count={count}
      fewer="Fewer seats"
      least={1}
      more="More seats"
      onCount={onCount}
    />,
  );
  return onCount;
};

describe("stepping a count up and down", () => {
  it("says the count it was given", async () => {
    await stepping(2);

    expect(screen.getByText("2")).toBeOnTheScreen();
  });

  it("steps up when the control that says so is pressed", async () => {
    const counted = await stepping(2);

    await fireEvent.press(screen.getByRole("button", { name: "More seats" }));

    expect(counted).toHaveBeenCalledWith(3);
  });

  it("steps down when the other one is", async () => {
    const counted = await stepping(2);

    await fireEvent.press(screen.getByRole("button", { name: "Fewer seats" }));

    expect(counted).toHaveBeenCalledWith(1);
  });

  it("stops at the least it is allowed rather than going under it", async () => {
    const counted = await stepping(1);

    await fireEvent.press(screen.getByRole("button", { name: "Fewer seats" }));

    expect(counted).toHaveBeenCalledWith(1);
  });

  it("reaches the platform's touch floor with both of its controls", async () => {
    await stepping(2);

    everyControlReachesTheTouchFloor();
  });

  it("takes the corner its own platform gives a round control", async () => {
    await stepping(2);
    const step = StyleSheet.flatten(
      screen.getByRole("button", { name: "More seats" }).props["style"],
    );

    expect(Number(step.borderRadius) >= Number(step.minHeight) / 2).toBe(
      Platform.OS === "android",
    );
  });
});
