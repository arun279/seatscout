export interface Section {
  readonly lines: readonly string[];
  readonly passed: boolean;
}

const FIGURE = /^\d/;

const cellsIn = (
  rows: readonly (readonly string[])[],
  column: number,
): readonly string[] => rows.flatMap((row) => row.slice(column, column + 1));

const alignment = (cells: readonly string[]): string =>
  cells.length > 0 && cells.every((cell) => FIGURE.test(cell)) ? "---:" : "---";

export const table = (
  headings: readonly string[],
  rows: readonly (readonly string[])[],
): readonly string[] => [
  `| ${headings.join(" | ")} |`,
  `| ${headings.map((_, column) => alignment(cellsIn(rows, column))).join(" | ")} |`,
  ...rows.map((row) => `| ${row.join(" | ")} |`),
];

export const verdict = (within: boolean, remedy: string): string =>
  within ? "Within it." : `Above it. ${remedy}`;
