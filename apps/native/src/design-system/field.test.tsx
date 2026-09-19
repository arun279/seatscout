import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Platform, StyleSheet } from "react-native";
import { contrastOf } from "../../test/contrast.js";
import { houseLights } from "../../test/lights.js";
import type { Appearance } from "../theme.js";
import { Field } from "./field.js";
import { Type } from "./type.js";

const APPEARANCES: readonly Appearance[] = ["down", "up"];

const drawn = async (
  over: {
    readonly appearance?: Appearance;
    readonly value?: string;
    readonly focused?: boolean;
    readonly onTyped?: (typed: string) => void;
    readonly onSettled?: () => void;
  } = {},
) => {
  houseLights(over.appearance ?? "down");
  await render(
    <Field
      focused={over.focused ?? false}
      label="Near, by postal code"
      onSettled={over.onSettled ?? (() => undefined)}
      onTyped={over.onTyped ?? (() => undefined)}
      value={over.value ?? ""}
    >
      <Type set="sentenceSmall" tone="silverFaint">
        The films and theaters below are the ones playing near it.
      </Type>
    </Field>,
  );
  const input = screen.getByLabelText("Near, by postal code");
  return { input, style: StyleSheet.flatten(input.props["style"]) };
};

describe("a field with its name above it", () => {
  it("is found by the name a screen reader says, and carries what it was given", async () => {
    const { input } = await drawn({ value: "75234" });

    expect(input).toHaveDisplayValue("75234");
    expect(screen.getByText("Near, by postal code")).toBeOnTheScreen();
  });

  it("says what a person types", async () => {
    const typed = jest.fn<(typed: string) => void>();
    const { input } = await drawn({ onTyped: typed });

    await fireEvent.changeText(input, "75006");

    expect(typed).toHaveBeenCalledWith("75006");
  });

  it("says when a person has finished with it", async () => {
    const settled = jest.fn();
    const { input } = await drawn({ onSettled: settled });

    await fireEvent(input, "blur");

    expect(settled).toHaveBeenCalledTimes(1);
  });

  it("takes the keyboard on opening only when it is the field that was asked for", async () => {
    const { input } = await drawn({ focused: true });

    expect(input).toHaveProp("autoFocus", true);
    expect((await drawn()).input).toHaveProp("autoFocus", false);
  });

  it("holds what it says beneath it", async () => {
    await drawn();

    expect(
      screen.getByText(
        "The films and theaters below are the ones playing near it.",
      ),
    ).toBeOnTheScreen();
  });

  it("takes the shape its own platform gives a text field", async () => {
    const { style } = await drawn();

    expect(Number(style.borderBottomWidth ?? 0) > 0).toBe(
      Platform.OS === "android",
    );
    expect(Number(style.borderWidth ?? 0) > 0).toBe(Platform.OS === "ios");
  });

  it("is deep enough for a thumb without the type moving", async () => {
    const { style } = await drawn();

    expect(Number(style.minHeight)).toBeGreaterThanOrEqual(48);
  });

  for (const appearance of APPEARANCES)
    it(`reads what was typed against the field's own ground, lights ${appearance}`, async () => {
      const { style } = await drawn({ appearance, value: "75234" });

      expect(
        contrastOf(String(style.backgroundColor), String(style.color)),
      ).toBeGreaterThanOrEqual(4.5);
    });
});
