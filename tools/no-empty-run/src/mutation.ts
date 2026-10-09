import type { Kind, Measured } from "./kind.ts";

interface Mutant {
  readonly status: string;
  readonly mutatorName?: string;
  readonly location?: {
    readonly start: { readonly line: number; readonly column: number };
  };
  readonly statusReason?: string;
}

interface Judged {
  readonly mutants: readonly Mutant[];
}

const NOT_JUDGED: readonly string[] = ["RuntimeError", "CompileError"];

interface Report {
  readonly files: Readonly<Record<string, Judged>>;
}

export const WEIGHED: readonly string[] = [
  "Killed",
  "Survived",
  "NoCoverage",
  "Timeout",
];

const notJudged = (report: Report): readonly string[] =>
  Object.entries(report.files).flatMap(([file, judged]) =>
    judged.mutants
      .filter((mutant) => NOT_JUDGED.includes(mutant.status))
      .map(
        (mutant) =>
          `${file}:${mutant.location?.start.line}:${mutant.location?.start.column} ${mutant.mutatorName} ${mutant.status}: ${mutant.statusReason?.split("\n")[0]}`,
      ),
  );

const refusalOf = (named: readonly string[]) =>
  named.length === 0
    ? {}
    : {
        refused: `records ${named.length} mutant(s) Stryker could not judge:\n${named.join("\n")}\n\nStryker leaves a runtime or compile error out of the score, so a break of 100 passes it,\nyet no test ever judged that mutant. Find why its run failed; the error is named above.\n`,
      };

const weighed = (report: Report): number =>
  Object.values(report.files)
    .flatMap((judged) => judged.mutants)
    .filter((mutant) => WEIGHED.includes(mutant.status)).length;

export const MUTATION: Kind = {
  measure: (text: string): Measured => {
    const report: Report = JSON.parse(text);
    const total = weighed(report);
    return {
      weighed: total,
      said: `records a run that weighed ${total} mutants.`,
      ...refusalOf(notJudged(report)),
    };
  },
  refusal: (path: string): string =>
    `${path} records a run that weighed no mutant.\n\nStryker scores such a run as NaN and breaks on score < threshold, so it passes its\nown gate. A mutation score is a verdict over the mutants it weighed, and there were\nnone: this shard's mutate glob in stryker.shards.json reaches no source, or every\nmutant was ignored or failed to compile.\n${WEIGHED.join(", ")} are the statuses that count.\n`,
  missing: (path: string): string =>
    `${path} does not exist, so the shard that writes it judged nothing.\n\nEach shard is judged from its report rather than from its exit code, and a shard that\nleft no report is a red verdict rather than a silent omission. Either the shard did\nnot run, or its report never reached the job reading it. stryker.shards.json names\nthe report every shard writes.\n`,
};
