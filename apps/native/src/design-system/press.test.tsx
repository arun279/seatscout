import { describe, expect, it } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { Press } from "./press.js";
import { Type } from "./type.js";

const opacityOf = (name: string) =>
  StyleSheet.flatten(screen.getByRole("button", { name }).props["style"])
    .opacity;

describe("a pressable control", () => {
  it("dims while it is held, as the platform's own buttons do", async () => {
    await render(
      <Press
        accessibilityLabel="Held"
        accessibilityRole="button"
        style={{ minHeight: 48, minWidth: 48 }}
        testOnly_pressed
      >
        <Type set="sentence" tone="silver">
          Held
        </Type>
      </Press>,
    );

    expect(opacityOf("Held")).toBe(0.2);
  });

  it("stands at full strength, in the style it was given, until it is held", async () => {
    await render(
      <Press
        accessibilityLabel="Resting"
        accessibilityRole="button"
        style={{ minHeight: 48, minWidth: 48 }}
      >
        <Type set="sentence" tone="silver">
          Resting
        </Type>
      </Press>,
    );

    expect(opacityOf("Resting")).toBeUndefined();
    expect(
      StyleSheet.flatten(
        screen.getByRole("button", { name: "Resting" }).props["style"],
      ).minHeight,
    ).toBe(48);
  });

  it("answers a press", async () => {
    const pressed: string[] = [];
    await render(
      <Press
        accessibilityLabel="Go"
        accessibilityRole="button"
        onPress={() => pressed.push("go")}
        style={{ minHeight: 48, minWidth: 48 }}
      >
        <Type set="sentence" tone="silver">
          Go
        </Type>
      </Press>,
    );

    await fireEvent.press(screen.getByRole("button", { name: "Go" }));

    expect(pressed).toEqual(["go"]);
  });
});
