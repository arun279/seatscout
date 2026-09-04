import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  branchName,
  FIRST_RUN,
  fromBranch,
  fromTag,
  HIGHEST_VERSION_CODE_GOOGLE_PLAY_ACCEPTS,
  planOf,
  RELEASE_BUILDS,
  refusalOf,
  requestOf,
  versionTag,
} from "./index.fixtures.js";
import { type ReleaseRequest, resolveReleasePlan } from "./index.js";

const MALFORMED_TAGS = ["", "banana", "1.2", "1.2.3.4", "01.2.3", "v"];

const UNSUPPORTED_TAGS = ["v1.2.3-beta.1", "1.2.3+build.7"];

const APPLE_MARKETING_VERSION = /^\d+\.\d+\.\d+$/;

const resolvableRequest = requestOf(
  fc.record({
    number: fc.integer({ min: 1, max: 1_000_000 }),
    attempt: fc.integer({ min: 1, max: 20 }),
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
