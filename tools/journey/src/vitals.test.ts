import { describe, expect, it } from "vitest";
import type { Sample } from "./samples.ts";
import { vitalsJudged } from "./vitals.ts";

const journeysOf = (
  lcp: readonly (number | null)[],
  inp: readonly (number | null)[],
  cls: readonly (number | null)[],
): readonly Sample[] =>
  lcp.map((value, at) => ({
    firstSeatGroupsMs: 100 + at,
    lcp: value,
    inp: inp[at] ?? null,
    cls: cls[at] ?? null,
    heapBytes: 1024,
    conditions: "a slow connection",
  }));

describe("holding the journey's Core Web Vitals to the thresholds Google publishes", () => {
  it("takes the 75th percentile of each axis and prints it beside its threshold", () => {
    const verdict = vitalsJudged(
      journeysOf(
        [100, 200, 300, 400],
        [10, 20, 30, 40],
        [0.001, 0.002, 0.003, 0.004],
      ),
    );

    expect(verdict.passed).toBe(true);
    expect(verdict.report).toBe(
      "p75 LCP 300 ms against 2500, INP 30 ms against 200, CLS 0.003 against 0.1, over 4 journeys",
    );
  });

  it("reads the same percentile whatever order the journeys were run in", () => {
    const same =
      "p75 LCP 300 ms against 2500, INP 30 ms against 200, CLS 0.003 against 0.1, over 4 journeys";

    expect(
      vitalsJudged(
        journeysOf(
          [100, 400, 200, 300],
          [10, 40, 20, 30],
          [0.001, 0.004, 0.002, 0.003],
        ),
      ).report,
    ).toBe(same);
    expect(
      vitalsJudged(
        journeysOf(
          [400, 300, 200, 100],
          [40, 30, 20, 10],
          [0.004, 0.003, 0.002, 0.001],
        ),
      ).report,
    ).toBe(same);
  });

  it("takes the eighth slowest of ten journeys, not the slowest", () => {
    expect(
      vitalsJudged(
        journeysOf(
          [1, 2, 3, 4, 5, 6, 7, 900, 2600, 2700],
          [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        ),
      ),
    ).toEqual({
      passed: true,
      report:
        "p75 LCP 900 ms against 2500, INP 8 ms against 200, CLS 0.000 against 0.1, over 10 journeys",
    });
  });

  it("stays green on a journey exactly at the LCP threshold, and goes red a millisecond over it", () => {
    expect(vitalsJudged(journeysOf([2500], [10], [0.01]))).toEqual({
      passed: true,
      report:
        "p75 LCP 2500 ms against 2500, INP 10 ms against 200, CLS 0.010 against 0.1, over 1 journeys",
    });
    expect(vitalsJudged(journeysOf([2501], [10], [0.01]))).toEqual({
      passed: false,
      report:
        "p75 LCP 2501 ms against 2500, INP 10 ms against 200, CLS 0.010 against 0.1, over 1 journeys; LCP over the threshold Google publishes as good",
    });
  });

  it("stays green on a journey exactly at the INP threshold, and goes red a millisecond over it", () => {
    expect(vitalsJudged(journeysOf([100], [200], [0.01])).passed).toBe(true);
    expect(vitalsJudged(journeysOf([100], [201], [0.01]))).toEqual({
      passed: false,
      report:
        "p75 LCP 100 ms against 2500, INP 201 ms against 200, CLS 0.010 against 0.1, over 1 journeys; INP over the threshold Google publishes as good",
    });
  });

  it("stays green on a journey exactly at the CLS threshold, and goes red a hundredth over it", () => {
    expect(vitalsJudged(journeysOf([100], [10], [0.1])).passed).toBe(true);
    expect(vitalsJudged(journeysOf([100], [10], [0.11]))).toEqual({
      passed: false,
      report:
        "p75 LCP 100 ms against 2500, INP 10 ms against 200, CLS 0.110 against 0.1, over 1 journeys; CLS over the threshold Google publishes as good",
    });
  });

  it("names every axis that breached, in the order the thresholds are published", () => {
    expect(vitalsJudged(journeysOf([9000], [900], [0.9])).report).toContain(
      "LCP, INP, CLS over the threshold Google publishes as good",
    );
  });

  it("rounds what it prints without rounding what it judges", () => {
    expect(vitalsJudged(journeysOf([2499.6], [199.4], [0.0994]))).toEqual({
      passed: true,
      report:
        "p75 LCP 2500 ms against 2500, INP 199 ms against 200, CLS 0.099 against 0.1, over 1 journeys",
    });
    expect(vitalsJudged(journeysOf([2500.4], [199.4], [0.0994]))).toEqual({
      passed: false,
      report:
        "p75 LCP 2500 ms against 2500, INP 199 ms against 200, CLS 0.099 against 0.1, over 1 journeys; LCP over the threshold Google publishes as good",
    });
  });

  it("refuses a head that measured no journey at all", () => {
    expect(vitalsJudged([])).toEqual({
      passed: false,
      report: "the head measured no Core Web Vital on some journey",
    });
  });

  it("refuses a head whose LCP, INP or CLS went unmeasured on one journey", () => {
    expect(vitalsJudged(journeysOf([100, null], [10, 20], [0, 0])).passed).toBe(
      false,
    );
    expect(vitalsJudged(journeysOf([100, 200], [10, null], [0, 0]))).toEqual({
      passed: false,
      report: "the head measured no Core Web Vital on some journey",
    });
    expect(
      vitalsJudged(journeysOf([100, 200], [10, 20], [0, null])).passed,
    ).toBe(false);
  });
});
