import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { Press } from "./press.js";
import { Type } from "./type.js";

const styleOf = (name: string) =>
  StyleSheet.flatten(screen.getByRole("button", { name }).props["style"]);

describe("a pressable control", () => {
  it("dims to 0.2 while it is held, as TouchableOpacity did", async () => {
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

    expect(styleOf("Held").opacity).toBe(0.2);
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

    expect(styleOf("Resting").opacity).toBeUndefined();
    expect(styleOf("Resting").minHeight).toBe(48);
  });
});
