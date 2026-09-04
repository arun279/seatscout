export interface Section {
  readonly lines: readonly string[];
  readonly passed: boolean;
}

const FIGURE = /^\d/;

const alignment = (
  rows: readonly (readonly string[])[],
  column: number,
): string =>
  rows.every((row) => FIGURE.test(row[column] ?? "")) ? "---:" : "---";

export const table = (
  headings: readonly string[],
  rows: readonly (readonly string[])[],
): readonly string[] => [
  `| ${headings.join(" | ")} |`,
  `| ${headings.map((_, column) => alignment(rows, column)).join(" | ")} |`,
  ...rows.map((row) => `| ${row.join(" | ")} |`),
];

export const verdict = (within: boolean, remedy: string): string =>
  within ? "Within it." : `Above it. ${remedy}`;
