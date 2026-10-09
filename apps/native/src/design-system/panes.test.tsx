import { describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { Dimensions, StyleSheet, Text } from "react-native";
import { houseLights } from "../../test/lights.js";
import { themeFor } from "../theme.js";
import { Panes, useTwoPanes } from "./panes.js";
import { Type } from "./type.js";

const Probe = () => <Text>{useTwoPanes() ? "two panes" : "one pane"}</Text>;

const said = (words: string) => (
  <Type set="sentence" tone="silver">
    {words}
  </Type>
);

const styleOf = (testID: string) =>
  StyleSheet.flatten(screen.getByTestId(testID).props["style"]);

describe("the two-pane class", () => {
  it.each<[number, string]>([
    [839, "one pane"],
    [840, "two panes"],
  ])("lays a window %s wide out as %s", async (width, said) => {
    const sized = jest
      .spyOn(Dimensions, "get")
      .mockReturnValue({ fontScale: 1, height: 800, scale: 2, width });
    await render(<Probe />);
    sized.mockRestore();

    expect(screen.getByText(said)).toBeOnTheScreen();
  });

  it("holds the list at a fixed width, ruled off from the room beside it", async () => {
    houseLights("down");
    await render(<Panes detail={said("room")} list={said("list")} />);

    expect(styleOf("list-pane")).toMatchObject({
      width: 400,
      borderRightWidth: 1,
      borderRightColor: themeFor("down").colours.hairline,
    });
    expect(screen.getByText("list")).toBeOnTheScreen();
  });

  it("stands the room on the deepest ground, as the room does on its own", async () => {
    houseLights("up");
    await render(<Panes detail={said("room")} list={said("list")} />);

    expect(styleOf("detail-pane")).toMatchObject({
      flex: 1,
      backgroundColor: themeFor("up").colours.houseDeep,
    });
    expect(screen.getByText("room")).toBeOnTheScreen();
  });
});
