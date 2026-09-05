import { calculateMutationTestMetrics } from "mutation-testing-metrics";
import { type Section, table } from "./markdown.js";

export interface Mutation {
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

export const mutationFrom = (report: string): Mutation => {
  const written = JSON.parse(report);
  const { mutationScore, totalDetected, totalValid } =
    calculateMutationTestMetrics(written).systemUnderTestMetrics.metrics;
  if (totalValid === 0) throw new Error(WEIGHED_NOTHING);
  return {
    score: mutationScore,
    detected: totalDetected,
    weighed: totalValid,
    breaksAt: threshold(written.thresholds?.break),
  };
};

export const mutation = (weighed: Mutation): Section => {
  const withinThreshold = weighed.score >= weighed.breaksAt;

  return {
    passed: withinThreshold,
    lines: [
      "### Mutation",
      "",
      "Stryker's own score over the run that wrote the report, held to the threshold named in",
      "that same report rather than to one restated here. A run that weighed no mutant is",
      "refused instead of scored, because such a run scores NaN and NaN is never below a",
      "threshold. The run is incremental: it starts from what the run on `main` last judged,",
      "and from this branch's own last run after that. Nothing cross-checks the two, so a",
      "verdict reused here is one that run reached rather than one reached again.",
      "",
      ...table(
        ["Score", "Detected", "Weighed", "Break"],
        [
          [
            weighed.score.toFixed(2),
            String(weighed.detected),
            String(weighed.weighed),
            String(weighed.breaksAt),
          ],
        ],
      ),
      "",
      `The score may not fall below the threshold, which is ${weighed.breaksAt}. ${
        withinThreshold ? "At or above it." : `Below it. ${REMEDY}`
      }`,
      "",
    ],
  };
};
