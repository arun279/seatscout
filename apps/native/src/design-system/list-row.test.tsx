import { describe, expect, it, jest } from "@jest/globals";
import {
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react-native";
import { Platform, StyleSheet, View } from "react-native";
import { houseLights } from "../../test/lights.js";
import { themeFor } from "../theme.js";
import { ListRow } from "./list-row.js";
import { Type } from "./type.js";

const ANDROID = Platform.OS === "android";

const rows = async (count: number, onPress: () => void = () => undefined) => {
  houseLights("down");
  const labels = ["row 1", "row 2", "row 3"].slice(0, count);
  await render(
    <View>
      {labels.map((label, at) => (
        <ListRow
          first={at === 0}
          key={label}
          label={label}
          last={at === count - 1}
          onPress={onPress}
        >
          <Type set="sentence" tone="silver">
            {`words ${at + 1}`}
          </Type>
        </ListRow>
      ))}
    </View>,
  );
};

const shapeOf = (at: number) =>
  StyleSheet.flatten(
    screen.getByRole("button", { name: `row ${at}` }).props["style"],
  );

describe("a row in a list of the platform's own kind", () => {
  it("is a button named for what it does, which answers a press", async () => {
    const pressed = jest.fn<() => void>();
    await rows(1, pressed);

    await fireEvent.press(screen.getByRole("button", { name: "row 1" }));

    expect(pressed).toHaveBeenCalledTimes(1);
    expect(screen.getByText("words 1")).toBeOnTheScreen();
  });

  it("stands on the raised ground and is at least as tall as the platform's two-line row", async () => {
    await rows(2);

    expect(shapeOf(1)).toMatchObject({
      backgroundColor: themeFor("down").colours.raised,
      minHeight: ANDROID ? 72 : 60,
    });
  });

  it("rounds the top of the first row and the bottom of the last", async () => {
    await rows(3);
    const outer = ANDROID ? 16 : 12;

    expect(shapeOf(1)).toMatchObject({
      borderTopLeftRadius: outer,
      borderTopRightRadius: outer,
    });
    expect(shapeOf(3)).toMatchObject({
      borderBottomLeftRadius: outer,
      borderBottomRightRadius: outer,
    });
    expect(shapeOf(2).borderRadius).toBe(ANDROID ? 4 : undefined);
    expect(shapeOf(2).borderTopLeftRadius).toBeUndefined();
    expect(shapeOf(2).borderBottomLeftRadius).toBeUndefined();
  });

  it("parts rows by a gap on Android and by an inset rule on iOS, never before the first", async () => {
    await rows(2);

    expect(shapeOf(1).marginTop).toBeUndefined();
    expect(shapeOf(2).marginTop).toBe(ANDROID ? 2 : undefined);
    const rulesIn = (name: string) =>
      within(screen.getByRole("button", { name })).queryAllByTestId("rule");
    expect(rulesIn("row 1")).toHaveLength(0);
    expect(rulesIn("row 2")).toHaveLength(ANDROID ? 0 : 1);
    const rules = rulesIn("row 2");
    for (const rule of rules)
      expect(StyleSheet.flatten(rule.props["style"])).toMatchObject({
        backgroundColor: themeFor("down").colours.hairline,
        left: 14,
      });
  });

  it("points onward with a 16 point chevron on iOS, and with none on Android", async () => {
    await rows(2);

    const chevrons = screen.queryAllByText("›");
    expect(chevrons).toHaveLength(ANDROID ? 0 : 2);
    for (const chevron of chevrons)
      expect(StyleSheet.flatten(chevron.props["style"]).fontSize).toBe(16);
  });
});
