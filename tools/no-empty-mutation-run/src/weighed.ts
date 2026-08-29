export interface Mutant {
  readonly status: string;
}

export interface Judged {
  readonly mutants: readonly Mutant[];
}

export interface Report {
  readonly files: Readonly<Record<string, Judged>>;
}

export const WEIGHED = ["Killed", "Survived", "NoCoverage", "Timeout"];

export const weighed = (report: Report): number =>
  Object.values(report.files)
    .flatMap((judged) => judged.mutants)
    .filter((mutant) => WEIGHED.includes(mutant.status)).length;

export const refusal = (path: string): string =>
  `${path} records a run that weighed no mutant.\n\nStryker scores such a run as NaN and breaks on score < threshold, so it passes its\nown gate. A mutation score is a verdict over the mutants it weighed, and there were\nnone: the mutate glob in stryker.config.json reaches no source, or every mutant was\nignored or failed to compile. ${WEIGHED.join(", ")} are the statuses that count.\n`;

export const missing = (path: string): string =>
  `${path} does not exist, so the mutation run wrote no report.\n\nThe run is judged from its report rather than from its exit code. Check that the json\nreporter is still named in stryker.config.json.\n`;
