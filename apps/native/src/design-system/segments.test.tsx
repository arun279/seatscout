import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Platform, StyleSheet } from "react-native";
import {
  everyControlReachesTheTouchFloor,
  everyControlSaysWhatItIs,
} from "../../test/floors.js";
import { houseLights } from "../../test/lights.js";
import { Segments } from "./segments.js";

const READINGS = [
  { value: "day", text: "One day" },
  { value: "days", text: "Some days" },
  { value: "range", text: "A range" },
] as const;

type Reading = (typeof READINGS)[number]["value"];

const segmenting = async (chosen: Reading) => {
  const onChosen = jest.fn<(chosen: Reading) => void>();
  await render(
    <Segments chosen={chosen} onChosen={onChosen} segments={READINGS} />,
  );
  return onChosen;
};

const segment = (name: string) => screen.getByRole("button", { name });

const styleOf = (name: string) =>
  StyleSheet.flatten(segment(name).props["style"]);

describe("a segmented control, exactly one segment chosen", () => {
  it("says which segment is chosen", async () => {
    await segmenting("days");

    expect(segment("Some days")).toBeSelected();
    expect(segment("One day")).not.toBeSelected();
    expect(segment("A range")).not.toBeSelected();
  });

  it("hands out the segment pressed", async () => {
    const chosen = await segmenting("day");

    await fireEvent.press(segment("A range"));

    expect(chosen).toHaveBeenCalledWith("range");
  });

  it("reaches the platform's touch floor and names every segment", async () => {
    await segmenting("day");

    everyControlReachesTheTouchFloor();
    everyControlSaysWhatItIs();
  });

  it("lifts the chosen segment off the track", async () => {
    houseLights("up");
    await segmenting("day");

    expect(styleOf("One day").backgroundColor).toBe(
      Platform.OS === "android" ? "#e2d8c6" : "#fefaf1",
    );
    expect(styleOf("Some days").backgroundColor).toBeUndefined();
  });

  it("draws a divider before every segment but the first on Android, and none on iOS", async () => {
    await segmenting("day");
    const divided = Platform.OS === "android" ? 1 : undefined;

    expect(styleOf("One day").borderLeftWidth).toBeUndefined();
    expect(styleOf("Some days").borderLeftWidth).toBe(divided);
    expect(styleOf("A range").borderLeftWidth).toBe(divided);
  });
});
