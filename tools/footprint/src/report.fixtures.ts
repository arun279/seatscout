import type { Bundle, Weighing } from "./bundles.js";
import type { Gates, Limits } from "./limits.js";
import { type Measurement, render, type Report } from "./report.js";
import type { Suites } from "./suites.js";
import type { Counts, Side, Tree } from "./volume.js";

export const counts = (code: number, comment: number): Counts => ({
  code,
  comment,
});

export const SOME_SOURCE: Tree = {
  "packages/core/src/seat.ts": counts(40, 0),
  "packages/core/src/seat.test.ts": counts(20, 0),
  "tools/footprint/src/report.ts": counts(30, 0),
};

export const side = (ref: string, over: Partial<Side> = {}): Side => ({
  ref,
  tree: SOME_SOURCE,
  ...over,
});

export const GATES: Gates = { cyclomatic: 10, cognitive: 15, lines: 300 };

export const LIMITS: Limits = {
  cyclomatic: { value: 9, at: "`packages/core/src/source/read.ts:41` `read`" },
  cognitive: { value: 14, at: "`tools/corpus-rows.mjs:39`" },
  longest: { value: 297, at: "`packages/core/src/domain/map.test.ts`" },
  crowding: 9,
};

export const SUITES: Suites = { unit: 487, screens: 76, endToEnd: 7 };

export const weighed = (
  bundles: readonly Bundle[],
  globsChanged = false,
): Weighing => ({ kind: "weighed", bundles, globsChanged });

export const measurement = (over: Partial<Measurement> = {}): Measurement => ({
  base: side("0123456789abcdef0123456789abcdef01234567"),
  head: side("fedcba9876543210fedcba9876543210fedcba98"),
  diff: { added: {}, removed: {}, modified: {} },
  bundles: weighed([
    { name: "app for iOS", main: 15, change: 15 },
    { name: "app's faces and images", main: 4, change: 4 },
  ]),
  gates: GATES,
  limits: LIMITS,
  suites: SUITES,
  ratchets: { comments: 0, tests: 1 },
  ...over,
});

export const reportOn = (
  over: Partial<Measurement> = {},
  bundleGrows = false,
): Report => render(measurement(over), bundleGrows);

export const between = (base: Tree, head: Tree, comments = 0): Report =>
  reportOn({
    base: side("b", { tree: base }),
    head: side("h", { tree: head }),
    ratchets: { comments, tests: 1 },
  });
