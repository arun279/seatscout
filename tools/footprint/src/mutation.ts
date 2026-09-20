import { calculateMutationTestMetrics } from "mutation-testing-metrics";
import { type Section, table } from "./markdown.js";

export interface Mutation {
  readonly over: string;
  readonly score: number;
  readonly detected: number;
  readonly weighed: number;
  readonly breaksAt: number;
}

const REMEDY =
  "Kill the mutants the run left alive, or cover the code no test reaches; the run names every one of them.";

const WEIGHED_NOTHING =
  "The mutation run weighed no mutant, so its score is NaN rather than a verdict, and NaN is never below a threshold. The mutate glob reaches no source, or every mutant was ignored or failed to compile.";

const threshold = (held: unknown): number => {
  if (typeof held !== "number")
    throw new Error(
      `The mutation report names no break threshold, so there is nothing to hold the score to:\n${JSON.stringify(held)}`,
    );
  return held;
};

export const mutationFrom = (over: string, report: string): Mutation => {
  const written = JSON.parse(report);
  const { mutationScore, totalDetected, totalValid } =
    calculateMutationTestMetrics(written).systemUnderTestMetrics.metrics;
  if (totalValid === 0) throw new Error(WEIGHED_NOTHING);
  return {
    over,
    score: mutationScore,
    detected: totalDetected,
    weighed: totalValid,
    breaksAt: threshold(written.thresholds?.break),
  };
};

const verdict = (weighed: Mutation) =>
  `${weighed.over}: the score may not fall below the threshold, which is ${weighed.breaksAt}. ${
    weighed.score >= weighed.breaksAt
      ? "At or above it."
      : `Below it. ${REMEDY}`
  }`;

export const mutation = (runs: readonly Mutation[]): Section => ({
  passed: runs.every((run) => run.score >= run.breaksAt),
  lines: [
    "### Mutation",
    "",
    "Stryker's own score over the runs that wrote the reports, each held to the threshold named",
    "in its own report rather than to one restated here. A run that weighed no mutant is refused",
    "instead of scored, because such a run scores NaN and NaN is never below a threshold. Two",
    "runners share the work: Vitest judges everything that runs in Node, and Jest judges the",
    "Expo app, which Vitest cannot render. Both runs are incremental: they start from what the",
    "run on `main` last judged, and from this branch's own last run after that. Nothing",
    "cross-checks the two, so a verdict reused here is one that run reached rather than one",
    "reached again.",
    "",
    ...table(
      ["Run", "Score", "Detected", "Weighed", "Break"],
      runs.map((run) => [
        run.over,
        run.score.toFixed(2),
        String(run.detected),
        String(run.weighed),
        String(run.breaksAt),
      ]),
    ),
    "",
    ...runs.map(verdict),
    "",
  ],
});
