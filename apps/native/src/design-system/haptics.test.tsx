import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { AccessibilityInfo, Text } from "react-native";
import { useSelectionTick } from "./haptics.js";

const mockTicked = jest.fn();

jest.mock("expo-haptics", () => ({ selectionAsync: () => mockTicked() }));

const Choice = (): ReactElement => {
  const tick = useSelectionTick();

  return (
    <Text accessibilityRole="button" onPress={tick}>
      choose
    </Text>
  );
};

const asking = (reduced: boolean) => {
  jest
    .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
    .mockResolvedValue(reduced);
};

const chosen = async () => {
  await render(<Choice />);
  await fireEvent.press(screen.getByRole("button", { name: "choose" }));
};

beforeEach(() => {
  mockTicked.mockClear();
});

describe("the tick a changed choice gives a thumb", () => {
  it("ticks once each time the choice is made", async () => {
    asking(false);

    await chosen();
    await fireEvent.press(screen.getByRole("button", { name: "choose" }));

    expect(mockTicked).toHaveBeenCalledTimes(2);
  });

  it("is silent where the system has asked for less motion", async () => {
    asking(true);

    await chosen();

    expect(mockTicked).not.toHaveBeenCalled();
  });
});
