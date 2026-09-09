import { describe, expect, it } from "vitest";
import { heapReported, judged } from "./ratchet.ts";
import type { Sample } from "./samples.ts";

const ON = "412 by 823 at 1.75x, 150 ms, 209715 B/s down";

const moments = (...values: readonly number[]): readonly Sample[] =>
  values.map((value) => ({
    firstSeatGroupsMs: value,
    lcp: 60,
    inp: 32,
    cls: 0,
    heapBytes: 1024,
    conditions: ON,
  }));

const under = (
  conditions: string | null,
  ...values: readonly number[]
): readonly Sample[] =>
  values.map((value) => ({
    firstSeatGroupsMs: value,
    lcp: 60,
    inp: 32,
    cls: 0,
    heapBytes: 1024,
    conditions,
  }));

const heaps = (...values: readonly (number | null)[]): readonly Sample[] =>
  values.map((value, at) => ({
    firstSeatGroupsMs: 100 + at,
    lcp: 60,
    inp: 32,
    cls: 0,
    heapBytes: value,
    conditions: ON,
  }));

describe("holding the head's journey to the merge base's", () => {
  it("refuses a head that measured no journey, whatever the base did", () => {
    const verdict = judged([], moments(100, 200, 300));

    expect(verdict.passed).toBe(false);
    expect(verdict.report).toBe("the head measured no journey");
  });

  it("refuses a base that measured no journey rather than passing over it", () => {
    const verdict = judged(moments(250), []);

    expect(verdict.passed).toBe(false);
    expect(verdict.report).toBe("the merge base measured no journey");
  });

  it("reports the head's median alone when the merge base has no journey to compare against", () => {
    expect(judged(moments(400, 200, 300), null)).toEqual({
      passed: true,
      report:
        "the head's first Seat Groups took 300 ms in the median of 3 journeys; there is no journey at the merge base to hold it to",
    });
  });

  it("goes red when the head's typical journey is slower than the base's slowest", () => {
    expect(judged(moments(600, 400, 500), moments(100, 200, 300))).toEqual({
      passed: false,
      report:
        "the head's first Seat Groups took 500 ms in the median of 3 journeys, slower than every journey the merge base made: the merge base's slowest of 3 journeys took 300 ms",
    });
  });

  it("stays green while the head's typical journey is within the base's slowest, equal included", () => {
    const base = moments(100, 200, 300);

    expect(judged(moments(270, 250, 260), base)).toEqual({
      passed: true,
      report:
        "the head's first Seat Groups took 260 ms in the median of 3 journeys; the merge base's slowest of 3 journeys took 300 ms",
    });
    expect(judged(moments(300, 300, 300), base).passed).toBe(true);
    expect(judged(moments(301, 200), base).passed).toBe(true);
    expect(judged(moments(302, 300), base).passed).toBe(false);
  });

  it("holds nothing to a merge base that ran its journeys under other conditions", () => {
    expect(
      judged(under("a slow connection", 900), under("no throttle", 100)),
    ).toEqual({
      passed: true,
      report:
        "the head's first Seat Groups took 900 ms in the median of 1 journeys under a slow connection; the merge base ran its journeys under no throttle, which is not the same measurement to hold it to",
    });
  });

  it("holds nothing to a merge base that recorded no conditions at all, and names that", () => {
    expect(judged(under("a slow connection", 900), under(null, 100))).toEqual({
      passed: true,
      report:
        "the head's first Seat Groups took 900 ms in the median of 1 journeys under a slow connection; the merge base ran its journeys under none recorded, which is not the same measurement to hold it to",
    });
  });

  it("holds nothing when neither side wrote down what it measured, because two blanks are not a match", () => {
    expect(judged(under(null, 900), under(null, 100))).toEqual({
      passed: true,
      report:
        "the head's first Seat Groups took 900 ms in the median of 1 journeys under none recorded; the merge base ran its journeys under none recorded, which is not the same measurement to hold it to",
    });
  });

  it("holds nothing when the head's own journeys disagree about what they measured", () => {
    const mixed = [
      ...under("a slow connection", 900),
      ...under("no throttle", 910),
    ];

    expect(judged(mixed, under("a slow connection", 100)).passed).toBe(true);
    expect(judged(mixed, under("a slow connection", 100)).report).toContain(
      "under none recorded",
    );
  });

  it("takes the median of an even number of journeys between the two middle ones", () => {
    expect(judged(moments(100, 700, 500, 200), moments(400)).report).toContain(
      "350 ms",
    );
  });
});

describe("reporting the JS heap beside the journey's time", () => {
  it("puts the head's median against the largest the merge base held", () => {
    expect(heapReported(heaps(4096, 8192, 6144), heaps(2048, 3072))).toBe(
      "the head's JS heap held 6 KiB in the median of 3 journeys; the merge base's largest of 2 journeys held 3 KiB",
    );
  });

  it("rounds the bytes to the nearest kibibyte rather than truncating them", () => {
    expect(heapReported(heaps(1434), null)).toContain("held 1 KiB");
    expect(heapReported(heaps(1638), null)).toContain("held 2 KiB");
  });

  it("says there is nothing to compare against when the merge base ran no journey", () => {
    expect(heapReported(heaps(4096), null)).toBe(
      "the head's JS heap held 4 KiB in the median of 1 journeys; there is no journey at the merge base to compare it with",
    );
  });

  it("says the merge base measured no heap when it predates the reading", () => {
    expect(heapReported(heaps(4096), heaps(2048, null))).toBe(
      "the head's JS heap held 4 KiB in the median of 1 journeys; the merge base measured no JS heap",
    );
    expect(heapReported(heaps(4096), [])).toBe(
      "the head's JS heap held 4 KiB in the median of 1 journeys; the merge base measured no JS heap",
    );
  });

  it("says the head measured no heap rather than reporting a figure it does not have", () => {
    expect(heapReported(heaps(4096, null), heaps(2048))).toBe(
      "the head measured no JS heap",
    );
    expect(heapReported([], heaps(2048))).toBe("the head measured no JS heap");
  });
});
