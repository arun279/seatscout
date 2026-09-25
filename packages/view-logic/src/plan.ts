import type { SeatGroupResult } from "@seatscout/client";

interface Dot {
  readonly cx: number;
  readonly cy: number;
}

const FRONT = 9;
const ROWS_SPAN = 32;
const CENTRE = 32;
const HALF_WIDTH = 30;

export const hundredths = (value: number): number =>
  Math.round(value * 100) / 100;

const x = (lateral: number) => hundredths(CENTRE + lateral * HALF_WIDTH);
const y = (depth: number) => hundredths(FRONT + depth * ROWS_SPAN);

const PICKER_ROWS = 10;

export const SEAT_PICKER: SeatGroupResult["plan"] = Array.from(
  { length: PICKER_ROWS },
  (_, row) => {
    const reach = 0.66 + (0.34 * row) / (PICKER_ROWS - 1);
    return {
      depth: row / (PICKER_ROWS - 1),
      runs: [{ from: -reach, to: reach }],
    };
  },
);

const held = (value: number, low: number, high: number) =>
  hundredths(Math.min(high, Math.max(low, value)));

export const aimAt = ({
  cx,
  cy,
}: Dot): { readonly targetDepth: number; readonly targetLateral: number } => ({
  targetDepth: held((cy - FRONT) / ROWS_SPAN, 0, 1),
  targetLateral: held((cx - CENTRE) / HALF_WIDTH, -1, 1),
});

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
