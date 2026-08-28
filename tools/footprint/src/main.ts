import { parseArgs } from "node:util";
import { type Measurement, render } from "./report.js";

export interface Writer {
  readonly write: (text: string) => void;
}

export type Measure = (base: string, head: string) => Measurement;

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
      out: { type: "string" },
    },
  });

  const report = render(
    measure(values.base ?? "origin/main", values.head ?? "HEAD"),
  );

  if (values.out) writeFile(values.out, report.markdown);
  out.write(report.markdown);
  return report.passed ? 0 : 1;
};
