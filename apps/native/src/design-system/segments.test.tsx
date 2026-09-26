import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { notificationAsync, selectionAsync } from "expo-haptics";
import { Platform, StyleSheet } from "react-native";
import { contrastOf } from "../../test/contrast.js";
import { houseLights } from "../../test/lights.js";
import { themeFor } from "../theme.js";
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

  it("plays one selection tick for the segment pressed", async () => {
    await segmenting("day");

    await fireEvent.press(segment("A range"));

    expect(selectionAsync).toHaveBeenCalledTimes(1);
    expect(notificationAsync).not.toHaveBeenCalled();
  });

  for (const appearance of ["down", "up"] as const)
    it(`sets the chosen segment apart from its track at 3:1 or more with the house lights ${appearance}`, async () => {
      houseLights(appearance);
      await segmenting("day");
      const { colours } = themeFor(appearance);
      const track =
        StyleSheet.flatten(segment("One day").parent?.props["style"])
          .backgroundColor ?? colours.house;

      expect(styleOf("One day").backgroundColor).toBe(colours.silver);
      expect(styleOf("Some days").backgroundColor).toBeUndefined();
      expect(
        contrastOf(String(styleOf("One day").backgroundColor), String(track)),
      ).toBeGreaterThanOrEqual(3);
    });

  it("sets the chosen segment's words in the ground's colour on its ink", async () => {
    houseLights("down");
    await segmenting("day");
    const colour = (name: string) =>
      StyleSheet.flatten(screen.getByText(name).props["style"]).color;

    expect(colour("One day")).toBe("#06070e");
    expect(colour("A range")).toBe("#aab2bd");
  });

  it("sinks the track on iOS and outlines it on Android", async () => {
    houseLights("down");
    await segmenting("day");
    const track = StyleSheet.flatten(segment("One day").parent?.props["style"]);

    expect(track).toMatchObject(
      Platform.OS === "android"
        ? { borderColor: "#a0a8b5", borderWidth: 1 }
        : { backgroundColor: "#161926", padding: 3 },
    );
  });

  it("draws a divider before every segment but the first on Android, and none on iOS", async () => {
    await segmenting("day");
    const divided = Platform.OS === "android" ? 1 : undefined;

    expect(styleOf("One day").borderLeftWidth).toBeUndefined();
    expect(styleOf("Some days").borderLeftWidth).toBe(divided);
    expect(styleOf("Some days").borderColor).toBe(
      Platform.OS === "android"
        ? themeFor("down").colours.silverFaint
        : undefined,
    );
    expect(styleOf("A range").borderLeftWidth).toBe(divided);
  });
});
