import { parse } from "semver";

type Platform = "ios" | "android";

type Lane = "testflight" | "internal";

type Ref =
  | {
      readonly kind: "branch";
      readonly name: string;
      readonly nearestTag: string | undefined;
    }
  | { readonly kind: "tag"; readonly name: string };

type Trigger =
  | { readonly event: "push"; readonly ref: Ref }
  | {
      readonly event: "dispatch";
      readonly ref: Ref;
      readonly platform: Platform;
      readonly lane: Lane;
    };

export type Run = { readonly number: number; readonly attempt: number };

export type ReleaseRequest = { readonly trigger: Trigger; readonly run: Run };

export type Build =
  | { readonly platform: "ios"; readonly lane: "testflight" }
  | { readonly platform: "android"; readonly lane: "internal" };

export type ReleasePlan = {
  readonly builds: readonly [Build, ...Build[]];
  readonly marketingVersion: string;
  readonly buildNumber: number;
};

type Refusal =
  | { readonly reason: "version-missing"; readonly ref: string }
  | { readonly reason: "version-malformed"; readonly tag: string }
  | { readonly reason: "version-unsupported"; readonly tag: string }
  | {
      readonly reason: "lane-unavailable";
      readonly platform: Platform;
      readonly lane: Lane;
    }
  | { readonly reason: "run-out-of-range"; readonly run: Run };

export type Resolution =
  | { readonly outcome: "plan"; readonly plan: ReleasePlan }
  | { readonly outcome: "refusal"; readonly refusal: Refusal };

const buildFor = {
  ios: { platform: "ios", lane: "testflight" },
  android: { platform: "android", lane: "internal" },
} as const satisfies Record<Platform, Build>;

const HIGHEST_VERSION_CODE = 2_100_000_000;
const ATTEMPTS_PER_RUN = 100;
const HIGHEST_RUN_NUMBER = HIGHEST_VERSION_CODE / ATTEMPTS_PER_RUN;

const countsUpTo = (value: number, highest: number) =>
  Number.isInteger(value) && value >= 1 && value <= highest;

const buildNumberOf = ({ number, attempt }: Run) =>
  countsUpTo(number, HIGHEST_RUN_NUMBER) &&
  countsUpTo(attempt, ATTEMPTS_PER_RUN)
    ? (number - 1) * ATTEMPTS_PER_RUN + attempt
    : undefined;

const versionTagOf = (ref: Ref) =>
  ref.kind === "tag" ? ref.name : ref.nearestTag;

const buildsOf = (trigger: Trigger): readonly [Build, ...Build[]] => {
  switch (trigger.event) {
    case "push":
      return [buildFor.ios, buildFor.android];
    case "dispatch":
      return [buildFor[trigger.platform]];
  }
};

const refuse = (refusal: Refusal): Resolution => ({
  outcome: "refusal",
  refusal,
});

export const resolveReleasePlan = (request: ReleaseRequest): Resolution => {
  const { trigger, run } = request;

  if (trigger.event === "dispatch") {
    const { platform, lane } = trigger;
    if (buildFor[platform].lane !== lane) {
      return refuse({ reason: "lane-unavailable", platform, lane });
    }
  }

  const tag = versionTagOf(trigger.ref);
  if (tag === undefined) {
    return refuse({ reason: "version-missing", ref: trigger.ref.name });
  }

  const version = parse(tag);
  if (version === null) {
    return refuse({ reason: "version-malformed", tag });
  }
  if (version.prerelease.length > 0 || version.build.length > 0) {
    return refuse({ reason: "version-unsupported", tag });
  }

  const buildNumber = buildNumberOf(run);
  if (buildNumber === undefined) {
    return refuse({ reason: "run-out-of-range", run });
  }

  return {
    outcome: "plan",
    plan: {
      builds: buildsOf(trigger),
      marketingVersion: version.version,
      buildNumber,
    },
  };
};
