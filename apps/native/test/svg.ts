import { screen } from "@testing-library/react-native";
import { type Host, hosts } from "./audit-tree.js";

export const drawnUnder = (testID: string, kind: string): readonly Host[] =>
  screen
    .getAllByTestId(testID, { includeHiddenElements: true })
    .flatMap((drawing) => hosts(drawing))
    .filter((node) => node.type === kind);

export const definedUnder = (
  testID: string,
  kind: "RNSVGFilter" | "RNSVGLinearGradient",
): readonly unknown[] =>
  drawnUnder(testID, kind).map((node) => node.props["name"]);

const BRUSH_FROM_URL = 1;

export const paintedWith = (
  id: unknown,
): { readonly type: number; readonly brushRef: unknown } => ({
  type: BRUSH_FROM_URL,
  brushRef: id,
});
