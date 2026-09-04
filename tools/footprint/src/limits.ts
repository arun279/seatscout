import { type Section, table } from "./markdown.js";

interface Peak {
  readonly value: number;
  readonly at: string;
}

export interface Limits {
  readonly cyclomatic: Peak;
  readonly cognitive: Peak;
  readonly longest: Peak;
  readonly crowding: number;
}

export interface Gates {
  readonly cyclomatic: number;
  readonly cognitive: number;
  readonly lines: number;
}

interface Finding {
  readonly value: number;
  readonly at: string;
}

interface Branching {
  readonly message: string;
  readonly filename: string;
  readonly labels: readonly { readonly span: { readonly line: number } }[];
}

interface Reported {
  readonly category: string;
  readonly message: string;
  readonly location: {
    readonly path: string;
    readonly start: { readonly line: number };
  };
}

export const OXLINT = ".oxlintrc.json";
export const BIOME = "biome.json";

const COGNITIVE = "lint/complexity/noExcessiveCognitiveComplexity";
const LENGTH = "lint/style/noExcessiveLinesPerFile";

const SCORE = /complexity of (\d+)/;
const COUNTED = /\((\d+)\)/;
const NAMED = /`([^`]+)`/;

const CROWDING = 0.9;

const valueIn = (message: string, pattern: RegExp, what: string): number => {
  const digits = pattern.exec(message)?.[1];
  if (digits === undefined)
    throw new Error(
      `${what} came back in a shape this report cannot read, so no figure came out of it:\n${message}`,
    );
  return Number(digits);
};

const branchingAt = (diagnostic: Branching): string => {
  const line = diagnostic.labels[0]?.span.line;
  if (line === undefined)
    throw new Error(
      `A cyclomatic complexity came back without a place, so there is nothing to name:\n${diagnostic.message}`,
    );
  const named = NAMED.exec(diagnostic.message)?.[1];
  const where = `\`${diagnostic.filename}:${line}\``;
  return named === undefined ? where : `${where} \`${named}\``;
};

const branchingIn = (oxlint: string): readonly Finding[] =>
  JSON.parse(oxlint).diagnostics.map((diagnostic: Branching) => ({
    value: valueIn(diagnostic.message, SCORE, "A cyclomatic complexity"),
    at: branchingAt(diagnostic),
  }));

const reported = (biome: string, category: string): readonly Reported[] =>
  JSON.parse(biome).diagnostics.filter(
    (diagnostic: Reported) => diagnostic.category === category,
  );

const understandingIn = (biome: string): readonly Finding[] =>
  reported(biome, COGNITIVE).map((diagnostic) => ({
    value: valueIn(diagnostic.message, SCORE, "A cognitive complexity"),
    at: `\`${diagnostic.location.path}:${diagnostic.location.start.line}\``,
  }));

const lengthsIn = (biome: string): readonly Finding[] =>
  reported(biome, LENGTH).map((diagnostic) => ({
    value: valueIn(diagnostic.message, COUNTED, "A file length"),
    at: `\`${diagnostic.location.path}\``,
  }));

const peak = (findings: readonly Finding[], what: string): Peak => {
  const value = Math.max(...findings.map((finding) => finding.value));
  const [at] = findings
    .filter((finding) => finding.value === value)
    .map((finding) => finding.at)
    .sort();
  if (at === undefined)
    throw new Error(
      `The report-only pass scored no ${what}, so there is no figure to report. Either it ran over nothing, or the rule it asks for is no longer the rule that gates.`,
    );
  return { value, at };
};

const configured = (held: unknown, where: string, what: string): number => {
  if (typeof held !== "number")
    throw new Error(
      `${where} sets no ${what}, so the report has no limit to stand the figure beside:\n${JSON.stringify(held)}`,
    );
  return held;
};

const maximum = (oxlint: string): unknown =>
  JSON.parse(oxlint).rules?.complexity?.[1]?.max;

const option = (
  biome: string,
  group: string,
  rule: string,
  name: string,
): unknown => JSON.parse(biome).linter?.rules?.[group]?.[rule]?.options?.[name];

export const gatesFrom = (oxlint: string, biome: string): Gates => ({
  cyclomatic: configured(
    maximum(oxlint),
    OXLINT,
    "cyclomatic complexity limit",
  ),
  cognitive: configured(
    option(
      biome,
      "complexity",
      "noExcessiveCognitiveComplexity",
      "maxAllowedComplexity",
    ),
    BIOME,
    "cognitive complexity limit",
  ),
  lines: configured(
    option(biome, "style", "noExcessiveLinesPerFile", "maxLines"),
    BIOME,
    "lines per file limit",
  ),
});

export const limitsFrom = (
  oxlint: string,
  biome: string,
  gates: Gates,
): Limits => {
  const lengths = lengthsIn(biome);
  const crowded = Math.ceil(gates.lines * CROWDING);
  return {
    cyclomatic: peak(branchingIn(oxlint), "function for branching"),
    cognitive: peak(understandingIn(biome), "function for understandability"),
    longest: peak(lengths, "file for its length"),
    crowding: lengths.filter((file) => file.value >= crowded).length,
  };
};

export const limits = (observed: Limits, gates: Gates): Section => ({
  passed: true,
  lines: [
    "### Complexity and file length",
    "",
    "Each limit here already fails the build when a function or a file passes it. The figure",
    "is the highest the tree reaches under that limit, taken by running the same rule at a",
    "threshold of one and reading its machine output. The gating passes are untouched, and",
    "the limits below are read from the files that configure them rather than restated.",
    "",
    ...table(
      ["Measure", "Highest", "Where", "Limit"],
      [
        [
          "Cyclomatic complexity, per function",
          String(observed.cyclomatic.value),
          observed.cyclomatic.at,
          String(gates.cyclomatic),
        ],
        [
          "Cognitive complexity, per function",
          String(observed.cognitive.value),
          observed.cognitive.at,
          String(gates.cognitive),
        ],
        [
          "Lines per file",
          String(observed.longest.value),
          observed.longest.at,
          String(gates.lines),
        ],
      ],
    ),
    "",
    `${observed.crowding} file(s) sit within 10% of the ${gates.lines} line limit, at ${Math.ceil(gates.lines * CROWDING)} lines or more.`,
    "Nothing in this section gates, because each of these limits is gated where it is",
    "measured. The count is what a decision to raise the line limit is made on: ADR 6 raises",
    "that limit on cost sustained across many files, never to make one file fit.",
    "",
  ],
});
