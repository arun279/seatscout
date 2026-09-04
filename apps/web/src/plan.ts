import type { SeatGroupResult } from "@seatscout/client";

interface Dot {
  readonly cx: number;
  readonly cy: number;
}

const FRONT = 9;
const ROWS_SPAN = 32;
const CENTRE = 32;
const HALF_WIDTH = 30;

const x = (lateral: number) => CENTRE + lateral * HALF_WIDTH;
const y = (depth: number) => FRONT + depth * ROWS_SPAN;

export const marksOf = (
  plan: SeatGroupResult["plan"],
  position: SeatGroupResult["position"],
  target: { readonly targetDepth: number; readonly targetLateral: number },
): {
  readonly rows: readonly {
    readonly x1: number;
    readonly x2: number;
    readonly y: number;
  }[];
  readonly pair: Dot;
  readonly target: Dot;
} => ({
  rows: plan.flatMap((row) =>
    row.runs.map((run) => ({
      x1: x(run.from),
      x2: x(run.to),
      y: y(row.depth),
    })),
  ),
  pair: { cx: x(position.lateral), cy: y(position.depth) },
  target: { cx: x(target.targetLateral), cy: y(target.targetDepth) },
});
