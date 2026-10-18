interface Position {
  readonly line: number;
  readonly column: number;
}

interface Mutant {
  readonly mutatorName: string;
  readonly replacement: string;
  readonly status: string;
  readonly location: { readonly start: Position; readonly end: Position };
}

interface Report {
  readonly files: Readonly<
    Record<string, { readonly source: string; readonly mutants: Mutant[] }>
  >;
}

export interface Judged {
  readonly shard: string;
  readonly outcome: string | undefined;
  readonly report: string | null;
}

interface Findings {
  readonly found: boolean;
  readonly body: string;
}

const JUDGED = ["Killed", "Survived", "NoCoverage", "Timeout"];

const MISSED: Readonly<Record<string, string>> = {
  Survived: "survived",
  NoCoverage: "reached by no test",
};

const ABOUT =
  "Stryker changed one place on each line this merge added or edited, as Google's code review does, and ran the tests that reach it. Fix each finding in the next pull request, before new feature work: add the test that kills the mutant, or say on this issue why it is not useful.";

const mutantsIn = (text: string) => {
  const { files }: Report = JSON.parse(text);
  return Object.entries(files).flatMap(([file, { source, mutants }]) =>
    mutants.map((mutant) => ({ file, source, mutant })),
  );
};

const offset = (lines: readonly string[], { line, column }: Position) =>
  lines.slice(0, line - 1).reduce((sum, each) => sum + each.length + 1, 0) +
  column -
  1;

const diffOf = (source: string, { replacement, location }: Mutant) => {
  const lines = source.split("\n");
  const { start, end } = location;
  const before = source.slice(
    offset(lines, { line: start.line, column: 1 }),
    offset(lines, start),
  );
  const after = source.slice(
    offset(lines, end),
    offset(lines, { line: end.line + 1, column: 1 }) - 1,
  );
  return [
    "```diff",
    ...lines.slice(start.line - 1, end.line).map((line) => `- ${line}`),
    ...`${before}${replacement}${after}`.split("\n").map((line) => `+ ${line}`),
    "```",
  ].join("\n");
};

const notJudgedBecause = ({ outcome, report }: Judged) => {
  if (outcome === undefined) return "left no result";
  if (outcome !== "success") return "broke";
  return report === null ? "left no report" : undefined;
};

const brokenIn = (job: Judged, run: string) => {
  const why = notJudgedBecause(job);
  return why === undefined
    ? []
    : [
        `The ${job.shard} job ${why}, so the lines it was given were not judged. [The run](${run}) says why.`,
      ];
};

const summaryOf = (judged: number, missed: number) =>
  missed === 0
    ? `No mutant survived of the ${judged} judged.`
    : `**${missed} of ${judged} mutants survived.**`;

export const findings = (
  jobs: readonly Judged[] | undefined,
  run: string,
): Findings => {
  if (jobs === undefined)
    return {
      found: true,
      body: `The plan of what to mutate could not be made, so nothing was judged. [The run](${run}) says why.`,
    };
  if (jobs.length === 0)
    return {
      found: false,
      body: "This merge adds or edits no line Stryker can mutate.",
    };
  const judged = jobs
    .flatMap((job) => (job.report === null ? [] : mutantsIn(job.report)))
    .filter(({ mutant }) => JUDGED.includes(mutant.status));
  const missed = judged.filter(({ mutant }) => mutant.status in MISSED);
  const broken = jobs.flatMap((job) => brokenIn(job, run));
  if (missed.length === 0 && broken.length === 0)
    return {
      found: false,
      body: `The tests killed all ${judged.length} mutants on this merge's lines.`,
    };
  return {
    found: true,
    body: [
      ABOUT,
      summaryOf(judged.length, missed.length),
      ...broken,
      ...missed.map(({ file, source, mutant }) =>
        [
          `### \`${file}:${mutant.location.start.line}\` ${mutant.mutatorName} ${MISSED[mutant.status]}`,
          "",
          diffOf(source, mutant),
        ].join("\n"),
      ),
    ].join("\n\n"),
  };
};
