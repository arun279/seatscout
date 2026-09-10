import type { Kind, Measured } from "./kind.ts";

interface Total {
  readonly sources: number;
  readonly lines: number;
  readonly duplicatedLines: number;
  readonly percentage: number;
}

export const DUPLICATION: Kind = {
  report: "reports/duplication/jscpd-report.json",
  measure: (text: string): Measured => {
    const { sources, lines, duplicatedLines, percentage }: Total =
      JSON.parse(text).statistics.total;
    return {
      weighed: sources,
      said: `records ${duplicatedLines} duplicated line(s) of ${lines} across ${sources} source(s), ${percentage.toFixed(2)}%.`,
    };
  },
  refusal: (path: string): string =>
    `${path} records a run that read no source.\n\njscpd exits zero both for duplication inside the threshold and for a run whose paths\nmatched no file, so its status cannot say which of the two happened. A duplication\npercentage is a verdict over the lines it read, and there were none: the paths handed\nto jscpd reach nothing, or every file under them is ignored.\n`,
  missing: (path: string): string =>
    `${path} does not exist, so the duplication run wrote no report.\n\nThe run is judged from its report rather than from its exit code. Check that the json\nreporter and the output directory are still named in .jscpd.json.\n`,
};
