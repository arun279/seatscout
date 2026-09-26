import { expect, jest } from "@jest/globals";
import { fireEvent, screen } from "@testing-library/react-native/pure";
import { notificationAsync, selectionAsync } from "expo-haptics";
import { TOUCH_FLOOR } from "../src/design-system/touch.js";
import {
  chosenIn,
  groundOf,
  type Host,
  hiddenFromReaders,
  hosts,
  inSentence,
  nameOf,
  numberIn,
  pressable,
  roleOf,
  STATEFUL_ROLES,
  styleOf,
  textIn,
} from "./audit-tree.js";
import { contrastOf } from "./contrast.js";

const HEX = /^#[0-9a-f]{6}$/i;
const TEXT_DEFAULTS = { color: "#000000", fontSize: 14 };
const READS = 4.5;
const READS_LARGE = 3;
const APART = 3;
const LARGE = 24;
const LARGE_BOLD = 18.66;
const BOLD = ["bold", "700", "800", "900"];
const CHOOSING_ROLES = ["button", "checkbox", "radio", "tab"];
const COMMIT = "velvet";

const CONTRAST = "WCAG 2.2 1.4.3 Contrast (Minimum)";
const NON_TEXT = "WCAG 2.2 1.4.11 Non-text Contrast";
const NAME_ROLE = "WCAG 2.2 4.1.2 Name, Role, Value";
const TARGET = "WCAG 2.2 2.5.8 Target Size (Minimum), at the platform's floor";
const LABELS = "WCAG 2.2 3.3.2 Labels or Instructions";
const RESIZE = "WCAG 2.2 1.4.4 Resize Text";
const FEEDBACK = "Apple HIG, Playing haptics";

const inherited = (node: Host, key: string): unknown => {
  for (let at: Host | null = node; at?.type === "Text"; at = at.parent) {
    const value = styleOf(at)[key];
    if (value !== undefined) return value;
  }
  return undefined;
};

const unreadable = (...colours: readonly string[]) =>
  colours.find((colour) => !HEX.test(colour));

const ownText = (node: Host) =>
  node.children.some(
    (child) => typeof child === "string" && child.trim().length > 0,
  );

const contrast = (node: Host, house: string): readonly string[] => {
  if (node.type !== "Text" || !ownText(node)) return [];
  const colour = String(inherited(node, "color") ?? TEXT_DEFAULTS.color);
  const ground = groundOf(node, house);
  const odd = unreadable(colour, ground);
  if (odd !== undefined)
    return [
      `${CONTRAST}: "${nameOf(node)}" is painted ${odd}, which is not a colour this audit can weigh`,
    ];
  const size = Number(inherited(node, "fontSize") ?? TEXT_DEFAULTS.fontSize);
  const bold = BOLD.includes(String(inherited(node, "fontWeight")));
  const floor =
    size >= LARGE || (bold && size >= LARGE_BOLD) ? READS_LARGE : READS;
  const ratio = contrastOf(colour, ground);
  return ratio < floor
    ? [
        `${CONTRAST}: "${nameOf(node)}" reads ${ratio.toFixed(2)} to 1 against ${ground}, under ${floor}`,
      ]
    : [];
};

const named = (node: Host) =>
  String(
    node.props["accessibilityLabel"] ?? node.props["aria-label"] ?? "",
  ).trim().length > 0 || textIn(node).length > 0;

const reaches = (node: Host) => {
  const style = styleOf(node);
  const slop: unknown = node.props["hitSlop"];
  const side = (edge: string) =>
    typeof slop === "number" ? slop : numberIn(slop, edge);
  const down = numberIn(style, "minHeight") + side("top") + side("bottom");
  const across = numberIn(style, "minWidth") + side("left") + side("right");
  return down >= TOUCH_FLOOR && across >= TOUCH_FLOOR;
};

const control = (node: Host): readonly string[] => {
  if (!pressable(node)) return [];
  const role = roleOf(node);
  const read = !hiddenFromReaders(node);
  return [
    ...(read && role === undefined
      ? [`${NAME_ROLE}: "${nameOf(node)}" can be pressed and has no role`]
      : []),
    ...(!read || named(node)
      ? []
      : [`${NAME_ROLE}: a ${String(role)} with no accessible name`]),
    ...(inSentence(node) || reaches(node)
      ? []
      : [
          `${TARGET}: "${nameOf(node)}" reaches less than ${TOUCH_FLOOR} by ${TOUCH_FLOOR}`,
        ]),
  ];
};

const labelled = (node: Host): readonly string[] =>
  node.type !== "TextInput" ||
  [
    "accessibilityLabel",
    "aria-label",
    "accessibilityLabelledBy",
    "aria-labelledby",
  ].some((key) => String(node.props[key] ?? "").trim().length > 0)
    ? []
    : [`${LABELS}: a text field with no label`];

const scales = (node: Host): readonly string[] =>
  ["Text", "TextInput"].includes(String(node.type)) &&
  node.props["allowFontScaling"] === false
    ? [`${RESIZE}: "${nameOf(node)}" refuses the reader's text size`]
    : [];

const colourIn = (node: Host, key: string) => {
  const value = styleOf(node)[key];
  return typeof value === "string" ? value : undefined;
};

const states = (nodes: readonly Host[], house: string): readonly string[] => {
  const stated = nodes.flatMap((node) => {
    const chosen = chosenIn(node.props["accessibilityState"]);
    if (chosen === undefined || !CHOOSING_ROLES.includes(String(roleOf(node))))
      return [];
    const ground = groundOf(node.parent ?? node, house);
    const fill = colourIn(node, "backgroundColor") ?? ground;
    return [
      {
        name: nameOf(node),
        chosen,
        group: node.parent,
        ground,
        fill,
        edge: colourIn(node, "borderColor") ?? fill,
      },
    ];
  });
  return stated.flatMap((one) => {
    const against = one.chosen
      ? [
          one.ground,
          ...stated
            .filter((other) => !other.chosen && other.group === one.group)
            .map((other) => other.fill),
        ]
      : [one.edge === one.ground ? undefined : one.ground];
    const paint = one.chosen ? one.fill : one.edge;
    return against.flatMap((other) => {
      if (other === undefined) return [];
      const ratio = contrastOf(paint, other);
      return ratio < APART
        ? [
            `${NON_TEXT}: "${one.name}" ${one.chosen ? "chosen" : "unchosen"} reads ${ratio.toFixed(2)} to 1 against ${other}, under ${APART}`,
          ]
        : [];
    });
  });
};

const answersWithFeel = (node: Host) =>
  chosenIn(node.props["accessibilityState"]) !== undefined ||
  STATEFUL_ROLES.includes(String(roleOf(node))) ||
  node.props["testID"] === COMMIT;

const attached = (node: Host, container: Host) => {
  let at: Host | null = node;
  while (at !== null && at !== container) at = at.parent;
  return at !== null;
};

const commitsLast = (one: Host, other: Host) =>
  Number(one.props["testID"] === COMMIT) -
  Number(other.props["testID"] === COMMIT);

const feedbackFailures = async (
  nodes: readonly Host[],
  container: Host,
): Promise<readonly string[]> => {
  const missing: string[] = [];
  const heard = new Set<Host | null>();
  for (const node of nodes
    .filter((one) => pressable(one) && answersWithFeel(one))
    .toReversed()
    .toSorted(commitsLast)) {
    if (!attached(node, container)) {
      if (!heard.has(node.parent))
        missing.push(
          `${FEEDBACK}: "${nameOf(node)}" left the screen when an earlier control was pressed, and nothing beside it was heard`,
        );
      continue;
    }
    jest.mocked(selectionAsync).mockClear();
    jest.mocked(notificationAsync).mockClear();
    const name = nameOf(node);
    const group = node.parent;
    if (
      node.props["value"] !== undefined &&
      typeof node.props["onClick"] !== "function"
    )
      await fireEvent(node, "valueChange", !node.props["value"]);
    else await fireEvent.press(node);
    const calls =
      jest.mocked(selectionAsync).mock.calls.length +
      jest.mocked(notificationAsync).mock.calls.length;
    if (calls > 0) heard.add(group);
    else
      missing.push(
        `${FEEDBACK}: "${name}" changes what is chosen or commits and plays no selection or notification feedback`,
      );
  }
  return missing;
};

const mountedContainer = (): Host | null => {
  if (screen.isDetached) return null;
  try {
    return screen.container;
  } catch (unreadable) {
    if (String(unreadable).includes("unmounted test renderer")) return null;
    throw unreadable;
  }
};

export const audit = async (house: string): Promise<void> => {
  const container = mountedContainer();
  if (container === null) return;
  const nodes = hosts(container);
  const failing = [
    ...nodes.flatMap((node) => [
      ...contrast(node, house),
      ...control(node),
      ...labelled(node),
      ...scales(node),
    ]),
    ...states(nodes, house),
  ];
  expect(failing).toEqual([]);
  expect(await feedbackFailures(nodes, container)).toEqual([]);
};
