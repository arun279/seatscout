export interface Total {
  readonly sources: number;
  readonly lines: number;
  readonly duplicatedLines: number;
  readonly percentage: number;
}

export interface Report {
  readonly statistics: { readonly total: Total };
}

export const measured = (report: Report): Total => report.statistics.total;

export const refusal = (path: string): string =>
  `${path} records a run that read no source.\n\njscpd exits zero both for duplication inside the threshold and for a run whose paths\nmatched no file, so its status cannot say which of the two happened. A duplication\npercentage is a verdict over the lines it read, and there were none: the paths handed\nto jscpd reach nothing, or every file under them is ignored.\n`;

export const missing = (path: string): string =>
  `${path} does not exist, so the duplication run wrote no report.\n\nThe run is judged from its report rather than from its exit code. Check that the json\nreporter and the output directory are still named in .jscpd.json.\n`;

export const reading = (path: string, total: Total): string =>
  `${path} records ${total.duplicatedLines} duplicated line(s) of ${total.lines} across ${total.sources} source(s), ${total.percentage.toFixed(2)}%.\n`;
