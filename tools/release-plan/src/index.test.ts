import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  type Build,
  type ReleasePlan,
  type ReleaseRequest,
  type Run,
  resolveReleasePlan,
} from "./index.js";

const RELEASE_BUILDS = [
  { platform: "ios", lane: "testflight" },
  { platform: "android", lane: "internal" },
] as const satisfies readonly Build[];

const MEANINGLESS_PAIRS = [
  { platform: "android", lane: "testflight" },
  { platform: "ios", lane: "internal" },
] as const;

const MALFORMED_TAGS = ["", "banana", "1.2", "1.2.3.4", "01.2.3", "v"];

const UNSUPPORTED_TAGS = ["v1.2.3-beta.1", "1.2.3+build.7"];

const HIGHEST_VERSION_CODE_GOOGLE_PLAY_ACCEPTS = 2_100_000_000;

const APPLE_MARKETING_VERSION = /^\d+\.\d+\.\d+$/;

const FIRST_RUN: Run = { number: 1, attempt: 1 };

const fromBranch = (tag: string, run: Run = FIRST_RUN): ReleaseRequest => ({
  trigger: {
    event: "push",
    ref: { kind: "branch", name: "main", nearestTag: tag },
  },
  run,
});

const fromTag = (tag: string): ReleaseRequest => ({
  trigger: { event: "push", ref: { kind: "tag", name: tag } },
  run: FIRST_RUN,
});

const planOf = (request: ReleaseRequest): ReleasePlan => {
  const resolution = resolveReleasePlan(request);
  if (resolution.outcome !== "plan") {
    throw new Error(`refused: ${JSON.stringify(resolution.refusal)}`);
  }
  return resolution.plan;
};

const refusalOf = (request: ReleaseRequest) => {
  const resolution = resolveReleasePlan(request);
  if (resolution.outcome !== "refusal") {
    throw new Error(`expected a refusal, got ${JSON.stringify(resolution)}`);
  }
  return resolution.refusal;
};

const buildNumberAt = (run: Run) =>
  planOf(fromBranch("v1.0.0", run)).buildNumber;

const runOrder = (a: Run, b: Run) =>
  Math.sign(a.number - b.number || a.attempt - b.attempt);

const releaseVersion = fc
  .tuple(fc.nat({ max: 99 }), fc.nat({ max: 99 }), fc.nat({ max: 99 }))
  .map((parts) => parts.join("."));

const versionTag = fc.oneof(
  releaseVersion,
  releaseVersion.map((version) => `v${version}`),
);

const branchName = fc.constantFrom("main", "release/1.x", "fix/seat-map");

const resolvableRef = fc.oneof(
  fc.record({
    kind: fc.constant("branch" as const),
    name: branchName,
    nearestTag: versionTag,
  }),
  fc.record({ kind: fc.constant("tag" as const), name: versionTag }),
);

const resolvableTrigger = fc.oneof(
  fc.record({ event: fc.constant("push" as const), ref: resolvableRef }),
  fc
    .tuple(resolvableRef, fc.constantFrom(...RELEASE_BUILDS))
    .map(([ref, build]) => ({ event: "dispatch" as const, ref, ...build })),
);

const requestOf = (run: fc.Arbitrary<Run>): fc.Arbitrary<ReleaseRequest> =>
  fc.record({ trigger: resolvableTrigger, run });

const resolvableRequest = requestOf(
  fc.record({
    number: fc.integer({ min: 1, max: 1_000_000 }),
    attempt: fc.integer({ min: 1, max: 20 }),
  }),
);

const neighbouringRequest = requestOf(
  fc.record({
    number: fc.integer({ min: 1, max: 12 }),
    attempt: fc.integer({ min: 1, max: 100 }),
  }),
);

const anyTag = fc.oneof(
  versionTag,
  fc.string(),
  fc.constantFrom(...MALFORMED_TAGS, ...UNSUPPORTED_TAGS),
);

const anyRef = fc.oneof(
  fc.record({
    kind: fc.constant("branch" as const),
    name: branchName,
    nearestTag: fc.option(anyTag, { nil: undefined }),
  }),
  fc.record({ kind: fc.constant("tag" as const), name: anyTag }),
);

const anyCounter = fc.oneof(
  fc.integer(),
  fc.double(),
  fc.constantFrom(0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY),
);

const anyRequest: fc.Arbitrary<ReleaseRequest> = fc.record({
  trigger: fc.oneof(
    fc.record({ event: fc.constant("push" as const), ref: anyRef }),
    fc.record({
      event: fc.constant("dispatch" as const),
      ref: anyRef,
      platform: fc.constantFrom("ios" as const, "android" as const),
      lane: fc.constantFrom("testflight" as const, "internal" as const),
    }),
  ),
  run: fc.oneof(
    fc.record({ number: anyCounter, attempt: anyCounter }),
    fc.record({
      number: fc.integer({ min: 1, max: 1_000 }),
      attempt: fc.integer({ min: 1, max: 3 }),
    }),
  ),
});

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

describe("resolution", () => {
  it("turns every trigger, ref and input into a plan or a stated refusal", () => {
    const outcomes = new Set<string>();

    fc.assert(
      fc.property(anyRequest, (request) => {
        const resolution = resolveReleasePlan(request);
        outcomes.add(resolution.outcome);
        if (resolution.outcome === "refusal") return;

        const { builds, marketingVersion, buildNumber } = resolution.plan;
        expect(builds.length).toBeGreaterThan(0);
        for (const build of builds) {
          expect(RELEASE_BUILDS).toContainEqual(build);
        }
        expect(marketingVersion).toMatch(APPLE_MARKETING_VERSION);
        expect(Number.isSafeInteger(buildNumber)).toBe(true);
        expect(buildNumber).toBeGreaterThanOrEqual(1);
        expect(buildNumber).toBeLessThanOrEqual(
          HIGHEST_VERSION_CODE_GOOGLE_PLAY_ACCEPTS,
        );
      }),
      { numRuns: 500 },
    );

    expect([...outcomes].sort()).toEqual(["plan", "refusal"]);
  });

  it("builds both platforms on a push and only the chosen one on a dispatch", () => {
    fc.assert(
      fc.property(resolvableRequest, (request) => {
        const platforms = planOf(request).builds.map((build) => build.platform);

        expect(platforms).toEqual(
          request.trigger.event === "push"
            ? ["ios", "android"]
            : [request.trigger.platform],
        );
      }),
    );
  });
});

describe("marketing versions", () => {
  it("takes the version from the tag the ref is", () => {
    expect(planOf(fromTag("v2.0.0")).marketingVersion).toBe("2.0.0");
  });

  it("takes the version from the nearest tag when the ref is a branch", () => {
    expect(planOf(fromBranch("v1.4.0")).marketingVersion).toBe("1.4.0");
  });

  it("refuses a branch that reaches no tag, naming the branch", () => {
    const request: ReleaseRequest = {
      trigger: {
        event: "push",
        ref: { kind: "branch", name: "fix/seat-map", nearestTag: undefined },
      },
      run: FIRST_RUN,
    };

    expect(refusalOf(request)).toEqual({
      reason: "version-missing",
      ref: "fix/seat-map",
    });
  });

  it.each(MALFORMED_TAGS)(
    "refuses %j when the run starts, not later at the store",
    (tag) => {
      expect(refusalOf(fromTag(tag))).toEqual({
        reason: "version-malformed",
        tag,
      });
    },
  );

  it.each(UNSUPPORTED_TAGS)(
    "refuses %j, which a marketing version cannot carry",
    (tag) => {
      expect(refusalOf(fromTag(tag))).toEqual({
        reason: "version-unsupported",
        tag,
      });
    },
  );
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
