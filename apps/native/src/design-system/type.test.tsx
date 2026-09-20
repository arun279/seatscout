import { describe, expect, it } from "@jest/globals";
import { cleanup, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import type { Role } from "../theme.js";
import { Type } from "./type.js";

const setIn = async (role: Role, words: string) => {
  await render(
    <Type set={role} tone="silver">
      {words}
    </Type>,
  );
  return StyleSheet.flatten(screen.getByText(words).props["style"]);
};

describe("a line of type", () => {
  it("sets the marquee in the display face, tracked and in upper case", async () => {
    expect(await setIn("marqueeTitle", "Two seats")).toMatchObject({
      fontFamily: "BigShouldersDisplay-SemiBold",
      fontSize: 30,
      letterSpacing: 0.75,
      textTransform: "uppercase",
    });
  });

  it("sets what the system attests in the mono face", async () => {
    expect(await setIn("ledgerRow", "2 seats · today · 75234")).toMatchObject({
      fontFamily: "SplineSansMono-Regular",
      fontSize: 11,
    });
  });

  it("sets a control's own label in the body face at its heavier weight", async () => {
    expect(await setIn("sentenceStrong", "Find seats")).toMatchObject({
      fontFamily: "SchibstedGrotesk-Bold",
      fontSize: 19,
    });
  });

  it("leads a line by the multiple its role names, measured at its resting size", async () => {
    expect(await setIn("ledger", "Today")).toMatchObject({
      fontSize: 12.5,
      lineHeight: 22.5,
    });
  });

  it("sets what a person reads at length in the body face", async () => {
    expect(await setIn("sentence", "Name an area")).toMatchObject({
      fontFamily: "SchibstedGrotesk-Regular",
      fontSize: 15,
      textTransform: "none",
    });
  });
});

describe("the size a person chose", () => {
  it("tells the platform to hold the marquee at twice its size, which is the 200 per cent the standard asks for", async () => {
    await render(
      <Type set="marqueeHero" tone="silver">
        Which movie?
      </Type>,
    );

    expect(
      screen.getByText("Which movie?").props["maxFontSizeMultiplier"],
    ).toBe(2);
  });

  it("leaves the marquee outside the title card uncapped, and every other role with it", async () => {
    for (const role of ["marqueeRow", "sentence", "ledgerRow"] as const) {
      await render(
        <Type set={role} tone="silver">
          Name an area
        </Type>,
      );

      expect(
        screen.getByText("Name an area").props["maxFontSizeMultiplier"],
      ).toBeUndefined();
      await cleanup();
    }
  });
});
