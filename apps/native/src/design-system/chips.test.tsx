import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { selectionAsync } from "expo-haptics";
import { Platform, StyleSheet } from "react-native";
import { houseLights } from "../../test/lights.js";
import { Chips, Choices } from "./chips.js";

const FORMATS = [
  { value: "IMAX", text: "IMAX" },
  { value: "Dolby Cinema", text: "Dolby Cinema" },
  { value: "3D", text: "3D" },
] as const;

type Format = (typeof FORMATS)[number]["value"];

const chipping = async (chosen?: readonly Format[]) => {
  const onChosen = jest.fn<(chosen: readonly Format[]) => void>();
  await render(<Chips chips={FORMATS} chosen={chosen} onChosen={onChosen} />);
  return onChosen;
};

const chip = (name: string) => screen.getByRole("button", { name });

describe("a group of chips, any number of them chosen", () => {
  it("offers every chip in the group", async () => {
    await chipping();

    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  it("says which chips are chosen", async () => {
    await chipping(["3D"]);

    expect(chip("3D")).toBeSelected();
    expect(chip("IMAX")).not.toBeSelected();
  });

  it("adds a chip pressed to what was chosen, in the order the group lists them", async () => {
    const chosen = await chipping(["3D"]);

    await fireEvent.press(chip("IMAX"));

    expect(chosen).toHaveBeenCalledWith(["IMAX", "3D"]);
  });

  it("takes a chosen chip out when it is pressed again", async () => {
    const chosen = await chipping(["3D", "IMAX"]);

    await fireEvent.press(chip("3D"));

    expect(chosen).toHaveBeenCalledWith(["IMAX"]);
  });

  it("plays one selection tick for the chip pressed", async () => {
    await chipping(["3D"]);

    await fireEvent.press(chip("IMAX"));

    expect(selectionAsync).toHaveBeenCalledTimes(1);
  });

  it("fills a chosen chip with the chosen ink and leaves the rest raised on an edge that reads", async () => {
    houseLights("down");
    await chipping(["IMAX"]);
    const style = (name: string) =>
      StyleSheet.flatten(chip(name).props["style"]);

    expect(style("IMAX").backgroundColor).toBe("#e6ecf2");
    expect(
      StyleSheet.flatten(screen.getByText("IMAX").props["style"]).color,
    ).toBe("#06070e");
    expect(
      StyleSheet.flatten(screen.getByText("3D").props["style"]).color,
    ).toBe("#e6ecf2");
    expect(style("3D")).toMatchObject({
      backgroundColor: "#161926",
      borderColor: "#a0a8b5",
    });
  });

  it("takes the corner and the mark its own platform gives a filter chip", async () => {
    await chipping(["IMAX"]);

    expect(StyleSheet.flatten(chip("IMAX").props["style"]).borderRadius).toBe(
      Platform.OS === "android" ? 8 : 12,
    );
    expect(screen.queryByText("✓") !== null).toBe(Platform.OS === "android");
  });
});

const GROUPS = [
  { key: "f", text: "F6·F7", sub: "Row 6 · on the centreline", value: 6 },
  {
    key: "g",
    text: "G8·G9",
    sub: "Row 7 · three seats right of centre",
    value: 7,
  },
] as const;

const choosing = async (
  onChoose?: (value: number) => void,
  chosen: string = "f",
) => {
  await render(
    <Choices choices={GROUPS} chosen={chosen} onChoose={onChoose} />,
  );
};

describe("a group of chips, exactly one of them chosen", () => {
  it("offers each as a radio named by its words and its sub-line", async () => {
    await choosing(() => undefined);

    expect(
      screen
        .getAllByRole("radio")
        .map((one) => one.props["accessibilityLabel"]),
    ).toEqual([
      "F6·F7, Row 6 · on the centreline",
      "G8·G9, Row 7 · three seats right of centre",
    ]);
  });

  it("checks the chosen one alone", async () => {
    await choosing(() => undefined, "g");

    expect(screen.getByRole("radio", { name: /^G8·G9/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /^F6·F7/ })).not.toBeChecked();
  });

  it("hands back the value of the one pressed, with one selection tick", async () => {
    const onChoose = jest.fn<(value: number) => void>();
    await choosing(onChoose);

    await fireEvent.press(screen.getByRole("radio", { name: /^G8·G9/ }));

    expect(onChoose).toHaveBeenCalledWith(7);
    expect(selectionAsync).toHaveBeenCalledTimes(1);
  });

  it("inks the sub-line as the chip it sits in is inked", async () => {
    houseLights("down");
    await choosing(() => undefined);
    const ink = (text: string) =>
      StyleSheet.flatten(screen.getByText(text).props["style"]).color;

    expect(ink("Row 6 · on the centreline")).toBe("#06070e");
    expect(ink("Row 7 · three seats right of centre")).toBe("#aab2bd");
  });

  it("stays drawn but takes no press while it waits on something outside the app", async () => {
    await choosing(undefined);

    expect(screen.queryAllByRole("radio")).toEqual([]);
    expect(screen.getAllByTestId("waiting")).toHaveLength(2);
    expect(screen.getByText("G8·G9")).toBeOnTheScreen();
  });
});
