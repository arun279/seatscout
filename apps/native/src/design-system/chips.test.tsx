import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Platform, StyleSheet } from "react-native";
import {
  everyControlReachesTheTouchFloor,
  everyControlSaysWhatItIs,
} from "../../test/floors.js";
import { houseLights } from "../../test/lights.js";
import { Chips } from "./chips.js";

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

  it("reaches the platform's touch floor and names every chip", async () => {
    await chipping();

    everyControlReachesTheTouchFloor();
    everyControlSaysWhatItIs();
  });

  it("fills a chosen chip and leaves the rest raised on a hairline", async () => {
    houseLights("down");
    await chipping(["IMAX"]);
    const style = (name: string) =>
      StyleSheet.flatten(chip(name).props["style"]);

    expect(style("IMAX").backgroundColor).toBe("#e6ecf2");
    expect(style("3D")).toMatchObject({
      backgroundColor: "#161926",
      borderColor: "#323748",
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
