import type { Gesture, Sample } from "./samples.ts";

const ON = "412 by 823 at 1.75x, 150 ms, 209715 B/s down";

const SAMPLE: Sample = {
  firstSeatGroupsMs: 100,
  lcp: 60,
  inp: 32,
  cls: 0,
  heapBytes: 1024,
  blockingMs: 40,
  longTasks: 2,
  conditions: ON,
};

const samples = <Value>(
  values: readonly Value[],
  differing: (value: Value, at: number) => Partial<Sample>,
): readonly Sample[] =>
  values.map((value, at) => ({ ...SAMPLE, ...differing(value, at) }));

export const moments = (...values: readonly number[]): readonly Sample[] =>
  samples(values, (firstSeatGroupsMs) => ({ firstSeatGroupsMs }));

export const under = (
  conditions: string | null,
  ...values: readonly number[]
): readonly Sample[] =>
  samples(values, (firstSeatGroupsMs) => ({ firstSeatGroupsMs, conditions }));

export const heaps = (
  ...values: readonly (number | null)[]
): readonly Sample[] =>
  samples(values, (heapBytes, at) => ({
    firstSeatGroupsMs: 100 + at,
    heapBytes,
  }));

export const blocked = (
  ...values: readonly (number | null)[]
): readonly Sample[] =>
  samples(values, (blockingMs, at) => ({
    firstSeatGroupsMs: 100 + at,
    blockingMs,
    longTasks: blockingMs === null ? null : 2,
  }));

export const counting = (
  ...counts: readonly (number | null)[]
): readonly Sample[] =>
  samples(counts, (longTasks, at) => ({
    firstSeatGroupsMs: 100 + at,
    blockingMs: 40 + at,
    longTasks,
  }));

export const dropping = (...values: readonly number[]): readonly Gesture[] =>
  values.map((droppedFrames) => ({ droppedFrames, conditions: ON }));
