import { declareValuePlugin, PluginKind } from "@stryker-mutator/api/plugin";

const DECLARED_IN = [
  "apps/native/src/theme.ts",
  "apps/native/src/app/_layout.tsx",
  "apps/native/src/design-system/screen-band.tsx",
  "apps/native/src/design-system/room-plan.tsx",
  "apps/native/src/design-system/banner.tsx",
  "apps/native/src/room/room.tsx",
  "apps/native/src/room/seat-map.tsx",
  "apps/native/src/room/row-bar.tsx",
  "apps/native/src/room/legend.tsx",
  "apps/native/src/room/alternates.tsx",
  "apps/native/src/room/dock.tsx",
  "apps/native/src/room/screen-edge.tsx",
];

const DRAWN =
  "A drawn value is held by the headed pass and its screenshots: the only test that kills a mutant in one restates the value, which is a tautological test.";

const isStyleSheetTable = (path) =>
  path.parentPath?.isCallExpression() === true &&
  path.parentPath.node.arguments[0] === path.node &&
  path.parentPath.get("callee").matchesPattern("StyleSheet.create");

const drawnIn = (path) => {
  const named = (path.hub?.file?.opts?.filename ?? "").replaceAll("\\", "/");
  return DECLARED_IN.some((file) => named.endsWith(file));
};

const declaredAtTheTop = (path) => {
  const declarator =
    path.parentPath?.isTSAsExpression() === true
      ? path.parentPath.parentPath
      : path.parentPath;
  if (declarator?.isVariableDeclarator() !== true) return false;
  const held = declarator.parentPath?.parentPath;
  return (
    held?.isProgram() === true || held?.isExportNamedDeclaration() === true
  );
};

export const strykerPlugins = [
  declareValuePlugin(PluginKind.Ignore, "drawn-values", {
    shouldIgnore(path) {
      if (!path.isObjectExpression()) return undefined;
      return isStyleSheetTable(path) ||
        (drawnIn(path) && declaredAtTheTop(path))
        ? DRAWN
        : undefined;
    },
  }),
];
