import { expect } from "@jest/globals";
import { screen, within } from "@testing-library/react-native/pure";
import { StyleSheet } from "react-native";
import { TOUCH_FLOOR } from "../src/design-system/touch.js";
import { contrastOf } from "./contrast.js";

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

const APART = 3;

const chosenIn = (state: unknown): boolean | undefined => {
  if (state === null || typeof state !== "object") return undefined;
  const flags = Object.entries(state)
    .filter(
      ([key, value]) =>
        ["selected", "checked"].includes(key) && typeof value === "boolean",
    )
    .map(([, value]) => value === true);
  return flags.length === 0 ? undefined : flags.includes(true);
};

const colourIn = (node: Control | null, named: string) => {
  const style: unknown = StyleSheet.flatten(node?.props["style"]);
  const value =
    style !== null && typeof style === "object"
      ? Object.entries(style).find(([key]) => key === named)?.[1]
      : undefined;
  return typeof value === "string" ? value : undefined;
};

const groundOf = (control: Control, fallback: string): string => {
  let node = control.parent;
  while (node !== null) {
    const ground = colourIn(node, "backgroundColor");
    if (ground !== undefined) return ground;
    node = node.parent;
  }
  return fallback;
};

export const everyStateReadsApart = (house: string): void => {
  if (screen.isDetached) return;
  const stated = screen.queryAllByRole("button").flatMap((control) => {
    const chosen = chosenIn(control.props["accessibilityState"]);
    if (chosen === undefined) return [];
    const ground = groundOf(control, house);
    const fill = colourIn(control, "backgroundColor") ?? ground;
    return [
      {
        name: String(control.props["accessibilityLabel"]),
        chosen,
        group: control.parent,
        ground,
        fill,
        edge: colourIn(control, "borderColor") ?? fill,
      },
    ];
  });
  const failing = stated.flatMap((control) => {
    const against = control.chosen
      ? [
          control.ground,
          ...stated
            .filter((other) => !other.chosen && other.group === control.group)
            .map((other) => other.fill),
        ]
      : [control.edge === control.ground ? undefined : control.ground];
    const paint = control.chosen ? control.fill : control.edge;
    return against.flatMap((other) => {
      if (other === undefined) return [];
      const ratio = contrastOf(paint, other);
      return ratio < APART ? [`${control.name}: ${ratio.toFixed(2)} to 1`] : [];
    });
  });
  expect(failing).toEqual([]);
};
