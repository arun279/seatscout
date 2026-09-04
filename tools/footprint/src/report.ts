import { type Bundle, bundles } from "./bundles.js";
import { type Gates, type Limits, limits } from "./limits.js";
import { type Mutation, mutation } from "./mutation.js";
import { type Suites, suites } from "./suites.js";
import { type Diff, type Side, volume } from "./volume.js";

export interface Ratchets {
  readonly comments: number;
  readonly tests: number;
}

export interface Measurement {
  readonly base: Side;
  readonly head: Side;
  readonly diff: Diff;
  readonly bundles: readonly Bundle[];
  readonly gates: Gates;
  readonly limits: Limits;
  readonly suites: Suites;
  readonly mutation: Mutation;
  readonly ratchets: Ratchets;
}

export interface Report {
  readonly markdown: string;
  readonly passed: boolean;
}

export const render = (measurement: Measurement): Report => {
  const sections = [
    volume(
      measurement.base,
      measurement.head,
      measurement.diff,
      measurement.ratchets.comments,
    ),
    bundles(measurement.bundles),
    limits(measurement.limits, measurement.gates),
    suites(measurement.suites, measurement.ratchets.tests),
    mutation(measurement.mutation),
  ];

  return {
    passed: sections.every((section) => section.passed),
    markdown: sections.flatMap((section) => section.lines).join("\n"),
  };
};
