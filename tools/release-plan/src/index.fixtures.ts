import * as fc from "fast-check";
import {
  type Build,
  type ReleasePlan,
  type ReleaseRequest,
  type Run,
  resolveReleasePlan,
} from "./index.js";

export const RELEASE_BUILDS = [
  { platform: "ios", lane: "testflight" },
  { platform: "android", lane: "internal" },
] as const satisfies readonly Build[];

export const HIGHEST_VERSION_CODE_GOOGLE_PLAY_ACCEPTS = 2_100_000_000;

export const FIRST_RUN: Run = { number: 1, attempt: 1 };

export const fromBranch = (
  tag: string,
  run: Run = FIRST_RUN,
): ReleaseRequest => ({
  trigger: {
    event: "push",
    ref: { kind: "branch", name: "main", nearestTag: tag },
  },
  run,
});

export const fromTag = (tag: string): ReleaseRequest => ({
  trigger: { event: "push", ref: { kind: "tag", name: tag } },
  run: FIRST_RUN,
});

export const planOf = (request: ReleaseRequest): ReleasePlan => {
  const resolution = resolveReleasePlan(request);
  if (resolution.outcome !== "plan") {
    throw new Error(`refused: ${JSON.stringify(resolution.refusal)}`);
  }
  return resolution.plan;
};

export const refusalOf = (request: ReleaseRequest) => {
  const resolution = resolveReleasePlan(request);
  if (resolution.outcome !== "refusal") {
    throw new Error(`expected a refusal, got ${JSON.stringify(resolution)}`);
  }
  return resolution.refusal;
};

const releaseVersion = fc
  .tuple(fc.nat({ max: 99 }), fc.nat({ max: 99 }), fc.nat({ max: 99 }))
  .map((parts) => parts.join("."));

export const versionTag = fc.oneof(
  releaseVersion,
  releaseVersion.map((version) => `v${version}`),
);

export const branchName = fc.constantFrom(
  "main",
  "release/1.x",
  "fix/seat-map",
);

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

export const requestOf = (
  run: fc.Arbitrary<Run>,
): fc.Arbitrary<ReleaseRequest> =>
  fc.record({ trigger: resolvableTrigger, run });
