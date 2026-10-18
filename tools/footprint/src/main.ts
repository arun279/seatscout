import { parseArgs } from "node:util";
import { type Measurement, render } from "./report.js";

export interface Writer {
  readonly write: (text: string) => void;
}

export type Measure = (
  base: string,
  head: string,
  mainTree: string,
  mainExported: boolean,
  nativeJest?: string,
) => Measurement;

const USAGE =
  "usage: footprint --main-tree <main, exported> [--base <ref>] [--head <ref>] [--main-unexported] [--bundle-grows] [--native-jest <Jest's JSON report>] [--out <file>]\n";

export const main = (
  argv: readonly string[],
  measure: Measure,
  writeFile: (path: string, contents: string) => void,
  out: Writer,
): number => {
  const { values } = parseArgs({
    args: argv.slice(2),
    options: {
      base: { type: "string" },
      head: { type: "string" },
      "main-tree": { type: "string" },
      "main-unexported": { type: "boolean" },
      "bundle-grows": { type: "boolean" },
      "native-jest": { type: "string" },
      out: { type: "string" },
    },
  });
  const mainTree = values["main-tree"];
  if (mainTree === undefined) {
    out.write(USAGE);
    return 2;
  }

  const report = render(
    measure(
      values.base ?? "origin/main",
      values.head ?? "HEAD",
      mainTree,
      values["main-unexported"] !== true,
      values["native-jest"],
    ),
    values["bundle-grows"] ?? false,
  );

  if (values.out) writeFile(values.out, report.markdown);
  out.write(report.markdown);
  return report.passed ? 0 : 1;
};
