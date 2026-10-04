import {
  commonTokens,
  declareFactoryPlugin,
  PluginKind,
  tokens,
} from "@stryker-mutator/api/plugin";

const EXACT = /^(.+):(\d+):(\d+)-(\d+):(\d+)$/;

const ELSEWHERE =
  "A range given with columns names one node, so a mutant nested inside it is judged by the job that names that mutant's own node.";

const notAfter = (a, b) =>
  a.line < b.line || (a.line === b.line && a.column <= b.column);

export const within = (inner, outer) =>
  notAfter(outer.start, inner.start) && notAfter(inner.end, outer.end);

const exactIn = (patterns) =>
  patterns.flatMap((pattern) => {
    const match = EXACT.exec(pattern);
    if (match === null) return [];
    const [, file, startLine, startColumn, endLine, endColumn] = match;
    return [
      {
        file,
        start: { line: Number(startLine), column: Number(startColumn) },
        end: { line: Number(endLine), column: Number(endColumn) },
      },
    ];
  });

export const exactRanges = ({ mutate }) => {
  const ranges = exactIn(mutate);
  return {
    shouldIgnore(path) {
      const named = (path.hub?.file?.opts?.filename ?? "").replaceAll(
        "\\",
        "/",
      );
      const held = ranges.filter((range) => named.endsWith(`/${range.file}`));
      return held.length === 0 ||
        held.some((range) => within(range, path.node.loc))
        ? undefined
        : ELSEWHERE;
    },
  };
};
exactRanges.inject = tokens(commonTokens.options);

export const strykerPlugins = [
  declareFactoryPlugin(PluginKind.Ignore, "exact-ranges", exactRanges),
];
