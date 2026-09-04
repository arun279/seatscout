import {
  type Counts,
  type Measurement,
  render,
  type Side,
  type Tree,
} from "./report.js";

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

export const reportOn = (over: Partial<Measurement>) =>
  render({
    base: side("0123456789abcdef0123456789abcdef01234567"),
    head: side("fedcba9876543210fedcba9876543210fedcba98"),
    diff: { added: {}, removed: {}, modified: {} },
    bundles: [{ name: "web app", size: 15, sizeLimit: 15, passed: true }],
    commentRatchet: 0,
    ...over,
  });

export const between = (base: Tree, head: Tree, commentRatchet = 0) =>
  reportOn({
    base: side("b", { tree: base }),
    head: side("h", { tree: head }),
    commentRatchet,
  });
