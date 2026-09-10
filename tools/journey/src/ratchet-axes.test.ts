import { describe, expect, it } from "vitest";
import { blocked, counting, dropping } from "./ratchet.fixtures.ts";
import { blockingJudged, blockingReported, framesJudged } from "./ratchet.ts";

describe("holding what the main thread was busy with to the merge base", () => {
  it("refuses a head that measured no blocking rather than reporting a figure it does not have", () => {
    expect(blockingJudged(blocked(null, 40), blocked(60))).toEqual({
      passed: false,
      report: "the head measured no blocking",
    });
    expect(blockingJudged([], blocked(60)).passed).toBe(false);
  });

  it("reports rather than holds when the merge base predates the reading", () => {
    expect(blockingJudged(blocked(40), blocked(60, null))).toEqual({
      passed: true,
      report:
        "the head's long tasks blocked the main thread for 40 ms in the median of 1 journeys; the merge base wrote down no blocking to hold it to",
    });
  });

  it("refuses a merge base that ran no journey at all", () => {
    expect(blockingJudged(blocked(40), [])).toEqual({
      passed: false,
      report: "the merge base measured no blocking",
    });
  });

  it("reports the head's median alone when the merge base has no journey", () => {
    expect(blockingJudged(blocked(40, 60, 50), null)).toEqual({
      passed: true,
      report:
        "the head's long tasks blocked the main thread for 50 ms in the median of 3 journeys; there is no blocking at the merge base to hold it to",
    });
  });

  it("goes red when the head blocked longer than every journey the base made", () => {
    expect(blockingJudged(blocked(120, 140, 130), blocked(40, 60, 50))).toEqual(
      {
        passed: false,
        report:
          "the head's long tasks blocked the main thread for 130 ms in the median of 3 journeys, more blocking than every blocking the merge base made: the merge base's worst of 3 journeys blocked for 60 ms",
      },
    );
  });

  it("stays green while the head is within the base's worst, equal included", () => {
    const base = blocked(40, 60, 50);

    expect(blockingJudged(blocked(60, 60, 60), base).passed).toBe(true);
    expect(blockingJudged(blocked(61, 61, 61), base).passed).toBe(false);
  });
});

describe("reporting the blocking against the threshold web.dev publishes", () => {
  it("names the worst count of long tasks, the definition and the published threshold", () => {
    expect(blockingReported(blocked(40, 60, 50))).toBe(
      "the head ran 2 long tasks at their worst, each over the 50 ms the W3C Long Tasks API defines one at, blocking for 50 ms in the median of 3 journeys against the 200 ms web.dev publishes as good on average mobile hardware; nothing here gates on that threshold, because this runner applies no CPU multiplier",
    );
  });

  it("takes the worst count of long tasks rather than the mildest", () => {
    expect(blockingReported(counting(1, 5, 2))).toContain(
      "the head ran 5 long tasks at their worst",
    );
  });

  it("says the head measured no long task rather than a figure it does not have", () => {
    expect(blockingReported(blocked(40, null))).toBe(
      "the head measured no long task",
    );
    expect(blockingReported(counting(2, null))).toBe(
      "the head measured no long task",
    );
    expect(blockingReported([])).toBe("the head measured no long task");
  });
});

describe("holding the frames a gesture dropped to the merge base", () => {
  it("refuses a head that made no gesture", () => {
    expect(framesJudged([], dropping(1))).toEqual({
      passed: false,
      report: "the head measured no gesture",
    });
  });

  it("refuses a merge base that made no gesture rather than passing over it", () => {
    expect(framesJudged(dropping(0), [])).toEqual({
      passed: false,
      report: "the merge base measured no gesture",
    });
  });

  it("reports the head alone when the merge base made no gesture to hold it to", () => {
    expect(framesJudged(dropping(0, 1, 0), null)).toEqual({
      passed: true,
      report:
        "the head's gesture dropped 0 frame(s) in the median of 3 gestures; there is no gesture at the merge base to hold it to",
    });
  });

  it("goes red when every gesture on the head dropped more than any the base made", () => {
    expect(framesJudged(dropping(2, 3, 4), dropping(0, 1, 0))).toEqual({
      passed: false,
      report:
        "the head's gesture dropped 3 frame(s) in the median of 3 gestures, more dropped frames than every gesture the merge base made: the merge base's worst of 3 gestures dropped 1 frame(s)",
    });
  });

  it("stays green while the head is within the base's worst, equal included", () => {
    const base = dropping(0, 1, 0);

    expect(framesJudged(dropping(1, 1, 1), base).passed).toBe(true);
    expect(framesJudged(dropping(2, 2, 2), base).passed).toBe(false);
  });

  it("holds nothing to a merge base whose gestures ran under other conditions", () => {
    expect(
      framesJudged(dropping(9), [{ droppedFrames: 0, conditions: "a laptop" }])
        .passed,
    ).toBe(true);
  });
});
