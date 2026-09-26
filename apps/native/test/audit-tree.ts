import type { screen } from "@testing-library/react-native/pure";
import { StyleSheet } from "react-native";

export type Host = typeof screen.container;

export const STATEFUL_ROLES: readonly string[] = [
  "switch",
  "checkbox",
  "radio",
];

export const styleOf = (
  node: Host | null,
): Readonly<Record<string, unknown>> => {
  const flat: unknown = StyleSheet.flatten(node?.props["style"]);
  return flat !== null && typeof flat === "object" ? { ...flat } : {};
};

export const numberIn = (held: unknown, named: string): number => {
  if (held === null || typeof held !== "object") return 0;
  const value = Object.entries(held).find(([key]) => key === named)?.[1];
  return typeof value === "number" ? value : 0;
};

export const hosts = (node: Host): readonly Host[] => [
  node,
  ...node.children.flatMap((child) =>
    typeof child === "string" ? [] : hosts(child),
  ),
];

export const textIn = (node: Host): string =>
  node.children
    .map((child) => (typeof child === "string" ? child : textIn(child)))
    .join("")
    .trim();

export const nameOf = (node: Host): string =>
  String(
    node.props["accessibilityLabel"] ??
      node.props["aria-label"] ??
      (textIn(node) || node.props["testID"] || node.type),
  );

export const groundOf = (node: Host, house: string): string => {
  for (let at: Host | null = node; at !== null; at = at.parent) {
    const ground = styleOf(at)["backgroundColor"];
    if (typeof ground === "string") return ground;
  }
  return house;
};

export const roleOf = (node: Host): unknown =>
  node.props["accessibilityRole"] ?? node.props["role"];

export const pressable = (node: Host): boolean =>
  typeof node.props["onClick"] === "function" ||
  typeof node.props["onResponderGrant"] === "function" ||
  (node.type === "Text" && typeof node.props["onPress"] === "function") ||
  STATEFUL_ROLES.includes(String(roleOf(node)));

export const hiddenFromReaders = (node: Host): boolean =>
  node.props["accessible"] === false &&
  node.props["importantForAccessibility"] === "no-hide-descendants";

export const inSentence = (node: Host): boolean =>
  node.type === "Text" && node.parent?.type === "Text";

export const chosenIn = (state: unknown): boolean | undefined => {
  if (state === null || typeof state !== "object") return undefined;
  const flags = Object.entries(state)
    .filter(
      ([key, value]) =>
        ["selected", "checked"].includes(key) && typeof value === "boolean",
    )
    .map(([, value]) => value === true);
  return flags.length === 0 ? undefined : flags.includes(true);
};
