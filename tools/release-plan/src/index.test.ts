import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  FIRST_RUN,
  fromBranch,
  fromTag,
  HIGHEST_VERSION_CODE_GOOGLE_PLAY_ACCEPTS,
  planOf,
  refusalOf,
  requestOf,
} from "./index.fixtures.js";
import type { ReleaseRequest, Run } from "./index.js";

const MEANINGLESS_PAIRS = [
  { platform: "android", lane: "testflight" },
  { platform: "ios", lane: "internal" },
] as const;

const buildNumberAt = (run: Run) =>
  planOf(fromBranch("v1.0.0", run)).buildNumber;

const runOrder = (a: Run, b: Run) =>
  Math.sign(a.number - b.number || a.attempt - b.attempt);

const neighbouringRequest = requestOf(
  fc.record({
    number: fc.integer({ min: 1, max: 12 }),
    attempt: fc.integer({ min: 1, max: 100 }),
  }),
);

const refName = (request: ReleaseRequest) => request.trigger.ref.name;

describe("build numbers", () => {
  it("rises strictly with the run and with nothing else", () => {
    const compared = { runs: 0, attempts: 0, refs: 0 };

    fc.assert(
      fc.property(
        neighbouringRequest,
        neighbouringRequest,
        (earlier, later) => {
          const before = planOf(earlier).buildNumber;
          const after = planOf(later).buildNumber;
          const order = runOrder(later.run, earlier.run);

          if (order === 0) {
            expect(after).toBe(before);
            return;
          }

          if (later.run.number === earlier.run.number) compared.attempts += 1;
          else compared.runs += 1;
          if (refName(later) !== refName(earlier)) compared.refs += 1;

          if (order > 0) expect(after).toBeGreaterThan(before);
          else expect(after).toBeLessThan(before);
        },
      ),
      { numRuns: 500 },
    );

    expect(compared.runs).toBeGreaterThan(0);
    expect(compared.attempts).toBeGreaterThan(0);
    expect(compared.refs).toBeGreaterThan(0);
  });

  it("outranks a newer version built earlier, so an older line ships forward", () => {
    const olderLine = planOf({
      trigger: {
        event: "push",
        ref: { kind: "branch", name: "release/1.x", nearestTag: "v1.0.0" },
      },
      run: { number: 500, attempt: 1 },
    });

    expect(olderLine.buildNumber).toBeGreaterThan(
      planOf(fromTag("v99.0.0")).buildNumber,
    );
  });

  it("numbers the first attempt of the first run 1", () => {
    expect(buildNumberAt(FIRST_RUN)).toBe(1);
  });

  it("keeps the last attempt of a run below the next run's first", () => {
    const lastAttempt = buildNumberAt({ number: 7, attempt: 100 });

    expect(lastAttempt).toBeGreaterThan(
      buildNumberAt({ number: 7, attempt: 1 }),
    );
    expect(lastAttempt).toBeLessThan(buildNumberAt({ number: 8, attempt: 1 }));
  });

  it("reaches the highest version code Google Play accepts", () => {
    const highest = { number: 21_000_000, attempt: 100 };

    expect(buildNumberAt(highest)).toBe(
      HIGHEST_VERSION_CODE_GOOGLE_PLAY_ACCEPTS,
    );
  });

  it.each([
    { number: 21_000_001, attempt: 1 },
    { number: 1, attempt: 101 },
    { number: 0, attempt: 1 },
    { number: 1, attempt: 0 },
    { number: Number.NaN, attempt: 1 },
    { number: 1.5, attempt: 1 },
  ])("refuses run $number attempt $attempt rather than numbering it", (run) => {
    expect(refusalOf(fromBranch("v1.0.0", run)).reason).toBe(
      "run-out-of-range",
    );
  });
});

describe("lanes", () => {
  it.each(MEANINGLESS_PAIRS)(
    "refuses a dispatch of $platform to the $lane lane",
    ({ platform, lane }) => {
      const refusal = refusalOf({
        trigger: {
          event: "dispatch",
          ref: { kind: "tag", name: "v1.0.0" },
          platform,
          lane,
        },
        run: FIRST_RUN,
      });

      expect(refusal).toEqual({ reason: "lane-unavailable", platform, lane });
    },
  );
});
