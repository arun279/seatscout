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

export const paintedWith = (
  id: unknown,
): { readonly type: number; readonly brushRef: unknown } => ({
  type: 1,
  brushRef: id,
});
