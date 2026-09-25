import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { StyleSheet, Text } from "react-native";
import { houseLights } from "../../test/lights.js";
import { type Appearance, themeFor } from "../theme.js";
import { Stage } from "./stage.js";

const APPEARANCES: readonly Appearance[] = ["down", "up"];

describe("the stage a screen stands on", () => {
  it.each(APPEARANCES)(
    "fills the screen with the house's own ground, lights %s",
    async (appearance) => {
      houseLights(appearance);
      await render(
        <Stage>
          <Text>on stage</Text>
        </Stage>,
      );

      expect(screen.getByText("on stage")).toBeOnTheScreen();
      expect(
        StyleSheet.flatten(screen.getByTestId("stage").props["style"]),
      ).toMatchObject({
        backgroundColor: themeFor(appearance).colours.house,
        flex: 1,
        gap: 9,
        padding: 18,
      });
    },
  );
});
