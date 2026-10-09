import type { Kind, Measured } from "./kind.ts";

interface Mutant {
  readonly status: string;
  readonly mutatorName: string;
  readonly location: {
    readonly start: { readonly line: number; readonly column: number };
  };
  readonly statusReason?: string;
}

interface Report {
  readonly files: Readonly<Record<string, { readonly mutants: Mutant[] }>>;
}

export const WEIGHED: readonly string[] = [
  "Killed",
  "Survived",
  "NoCoverage",
  "Timeout",
];

const NOT_JUDGED: readonly string[] = ["RuntimeError", "CompileError"];

const isReport = (parsed: unknown): parsed is Report =>
  typeof parsed === "object" &&
  parsed !== null &&
  "files" in parsed &&
  typeof parsed.files === "object" &&
  parsed.files !== null;

const mutantsOf = (report: Report) =>
  Object.entries(report.files).flatMap(([file, judged]) =>
    judged.mutants.map((mutant) => ({ file, mutant })),
  );

const named = ({ file, mutant }: { file: string; mutant: Mutant }) =>
  `${file}:${mutant.location.start.line}:${mutant.location.start.column} ${mutant.mutatorName} ${mutant.status}: ${mutant.statusReason?.split("\n")[0]}`;

const NONE_WEIGHED = `records a run that weighed no mutant.\n\nStryker scores such a run as NaN and breaks on score < threshold, so it passes its\nown gate. A mutation score is a verdict over the mutants it weighed, and there were\nnone: this shard's mutate glob in stryker.shards.json reaches no source, or every\nmutant was ignored.\n${WEIGHED.join(", ")} are the statuses that count.\n`;

const refusalOf = (
  weighed: number,
  notJudged: readonly string[],
): string | undefined => {
  if (notJudged.length > 0)
    return `records ${notJudged.length} mutant(s) Stryker could not judge:\n${notJudged.join("\n")}\n\nStryker leaves a runtime or compile error out of the score, so a break of 100 passes it,\nyet no test ever judged that mutant. Find why its run failed; the error is named above.\n`;
  return weighed === 0 ? NONE_WEIGHED : undefined;
};

export const MUTATION: Kind = {
  measure: (text: string): Measured => {
    const parsed: unknown = JSON.parse(text);
    if (!isReport(parsed))
      return { weighed: 0, said: "", refused: "holds no Stryker report.\n" };
    const all = mutantsOf(parsed);
    const weighed = all.filter(({ mutant }) =>
      WEIGHED.includes(mutant.status),
    ).length;
    const refused = refusalOf(
      weighed,
      all.filter(({ mutant }) => NOT_JUDGED.includes(mutant.status)).map(named),
    );
    return {
      weighed,
      said: `records a run that weighed ${weighed} mutants.`,
      refused,
    };
  },
  missing: (path: string): string =>
    `${path} does not exist, so the shard that writes it judged nothing.\n\nEach shard is judged from its report rather than from its exit code, and a shard that\nleft no report is a red verdict rather than a silent omission. Either the shard did\nnot run, or its report never reached the job reading it. stryker.shards.json names\nthe report every shard writes.\n`,
};
