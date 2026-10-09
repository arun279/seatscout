import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { Platform, StyleSheet } from "react-native";
import { houseLights } from "../../test/lights.js";
import { drawnUnder } from "../../test/svg.js";
import { themeFor } from "../theme.js";
import { Token, TokenFace } from "./token.js";

const ANDROID = Platform.OS === "android";

const boxOf = (name: string) =>
  StyleSheet.flatten(screen.getByRole("button", { name }).props["style"]);

describe("a term drawn as a token", () => {
  it("takes the platform's own corner, padding and touch floor", async () => {
    await render(
      <Token
        onPress={() => undefined}
        set="ledgerField"
        tone="silver"
        words="Near 75234"
      />,
    );

    expect(boxOf("Near 75234")).toMatchObject({
      borderRadius: ANDROID ? 8 : 12,
      paddingHorizontal: ANDROID ? 12 : 14,
      gap: ANDROID ? 4 : 8,
      minHeight: ANDROID ? 48 : 44,
      minWidth: ANDROID ? 48 : 44,
      borderWidth: 1,
    });
  });

  it("draws a blank with a heavier edge than a named term", async () => {
    await render(
      <Token
        blank
        onPress={() => undefined}
        set="ledgerField"
        tone="silver"
        words="Near where?"
      />,
    );

    expect(boxOf("Near where?").borderWidth).toBe(1.5);
  });

  it("marks a menu with the platform's own sign: the drop arrow on Android, the up and down chevrons on iOS", async () => {
    await render(
      <TokenFace menu set="ledgerField" tone="silver" words="Today" />,
    );

    expect(
      drawnUnder("menu-mark", "RNSVGPath").map((path) => path.props["d"]),
    ).toEqual([
      ANDROID ? "M7 10l5 5 5-5z" : "M2 6 L5 3 L8 6 M2 10 L5 13 L8 10",
    ]);
  });

  it("draws a term that opens a menu as a named term: filled, edged, and in its own tone", async () => {
    houseLights("down");
    await render(
      <TokenFace menu set="ledgerField" tone="silver" words="Today" />,
    );
    const { colours } = themeFor("down");

    expect(boxOf("Today")).toMatchObject({
      backgroundColor: colours.raised,
      borderColor: colours.silverFaint,
      borderWidth: 1,
    });
    expect(
      StyleSheet.flatten(screen.getByText("Today").props["style"]).color,
    ).toBe(colours.silver);
  });
});
