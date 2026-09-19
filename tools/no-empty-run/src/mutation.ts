import type { Kind, Measured } from "./kind.ts";

interface Mutant {
  readonly status: string;
}

interface Judged {
  readonly mutants: readonly Mutant[];
}

interface Report {
  readonly files: Readonly<Record<string, Judged>>;
}

export const WEIGHED: readonly string[] = [
  "Killed",
  "Survived",
  "NoCoverage",
  "Timeout",
];

const weighed = (report: Report): number =>
  Object.values(report.files)
    .flatMap((judged) => judged.mutants)
    .filter((mutant) => WEIGHED.includes(mutant.status)).length;

export const MUTATION: Kind = {
  measure: (text: string): Measured => {
    const total = weighed(JSON.parse(text));
    return {
      weighed: total,
      said: `records a run that weighed ${total} mutants.`,
    };
  },
  refusal: (path: string): string =>
    `${path} records a run that weighed no mutant.\n\nStryker scores such a run as NaN and breaks on score < threshold, so it passes its\nown gate. A mutation score is a verdict over the mutants it weighed, and there were\nnone: this shard's mutate glob in stryker.shards.json reaches no source, or every\nmutant was ignored or failed to compile.\n${WEIGHED.join(", ")} are the statuses that count.\n`,
  missing: (path: string): string =>
    `${path} does not exist, so the shard that writes it judged nothing.\n\nEach shard is judged from its report rather than from its exit code, and a shard that\nleft no report is a red verdict rather than a silent omission. Either the shard did\nnot run, or its report never reached the job reading it. stryker.shards.json names\nthe report every shard writes.\n`,
};
