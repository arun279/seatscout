import { readingsOf, type Sample } from "./samples.ts";
import type { Verdict } from "./verdict.ts";

const GOOD = { lcp: 2500, inp: 200, cls: 0.1 };

const p75 = (values: readonly number[]): number | null =>
  values.toSorted((a, b) => a - b)[Math.ceil(values.length * 0.75) - 1] ?? null;

const p75Of = (
  head: readonly Sample[],
  axis: (sample: Sample) => number | null,
): number | null => {
  const readings = readingsOf(head, axis);
  return readings === null ? null : p75(readings);
};

export const vitalsJudged = (head: readonly Sample[]): Verdict => {
  const lcp = p75Of(head, (run) => run.lcp);
  const inp = p75Of(head, (run) => run.inp);
  const cls = p75Of(head, (run) => run.cls);
  if (lcp === null || inp === null || cls === null)
    return {
      passed: false,
      report: "the head measured no Core Web Vital on some journey",
    };

  const measured = `p75 LCP ${Math.round(lcp)} ms against ${GOOD.lcp}, INP ${Math.round(inp)} ms against ${GOOD.inp}, CLS ${cls.toFixed(3)} against ${GOOD.cls}, over ${head.length} journeys`;
  const over = [
    lcp < GOOD.lcp ? null : "LCP",
    inp < GOOD.inp ? null : "INP",
    cls < GOOD.cls ? null : "CLS",
  ].filter((axis) => axis !== null);
  return over.length === 0
    ? { passed: true, report: measured }
    : {
        passed: false,
        report: `${measured}; ${over.join(", ")} over the threshold Google publishes as good`,
      };
};
