import { expect } from "@jest/globals";
import { screen, within } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { TOUCH_FLOOR } from "../src/design-system/touch.js";

type Control = ReturnType<typeof screen.getAllByRole>[number];

const at = (held: unknown, named: string): number => {
  if (held === null || typeof held !== "object") return 0;
  const value = Object.entries(held).find(([key]) => key === named)?.[1];
  return typeof value === "number" ? value : 0;
};

const reaches = (control: Control) => {
  const style: unknown = StyleSheet.flatten(control.props["style"]);
  const slop: unknown = StyleSheet.flatten(control.props["hitSlop"]);
  const down = at(style, "minHeight") + at(slop, "top") + at(slop, "bottom");
  const across = at(style, "minWidth") + at(slop, "left") + at(slop, "right");
  return down >= TOUCH_FLOOR && across >= TOUCH_FLOOR;
};

const says = (control: Control) =>
  String(control.props["accessibilityLabel"] ?? "").trim().length > 0 ||
  within(control).queryAllByText(/\S/).length > 0;

const failing = (holds: (control: Control) => boolean) => {
  const controls = screen.getAllByRole("button");
  expect(controls.length).toBeGreaterThan(0);
  return controls
    .map((control, index) => ({ at: index, control }))
    .filter(({ control }) => !holds(control))
    .map(({ at: index }) => index);
};

export const everyControlReachesTheTouchFloor = (): void => {
  expect(failing(reaches)).toEqual([]);
};

export const everyControlSaysWhatItIs = (): void => {
  expect(failing(says)).toEqual([]);
};
