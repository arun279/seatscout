import type { Gesture, Sample } from "./samples.ts";

const ON = "412 by 823 at 1.75x, 150 ms, 209715 B/s down";

export const moments = (...values: readonly number[]): readonly Sample[] =>
  values.map((value) => ({
    firstSeatGroupsMs: value,
    lcp: 60,
    inp: 32,
    cls: 0,
    heapBytes: 1024,
    blockingMs: 40,
    longTasks: 2,
    conditions: ON,
  }));

export const under = (
  conditions: string | null,
  ...values: readonly number[]
): readonly Sample[] =>
  values.map((value) => ({
    firstSeatGroupsMs: value,
    lcp: 60,
    inp: 32,
    cls: 0,
    heapBytes: 1024,
    blockingMs: 40,
    longTasks: 2,
    conditions,
  }));

export const heaps = (
  ...values: readonly (number | null)[]
): readonly Sample[] =>
  values.map((value, at) => ({
    firstSeatGroupsMs: 100 + at,
    lcp: 60,
    inp: 32,
    cls: 0,
    heapBytes: value,
    blockingMs: 40,
    longTasks: 2,
    conditions: ON,
  }));

export const blocked = (
  ...values: readonly (number | null)[]
): readonly Sample[] =>
  values.map((value, at) => ({
    firstSeatGroupsMs: 100 + at,
    lcp: 60,
    inp: 32,
    cls: 0,
    heapBytes: 1024,
    blockingMs: value,
    longTasks: value === null ? null : 2,
    conditions: ON,
  }));

export const counting = (
  ...counts: readonly (number | null)[]
): readonly Sample[] =>
  counts.map((count, at) => ({
    firstSeatGroupsMs: 100 + at,
    lcp: 60,
    inp: 32,
    cls: 0,
    heapBytes: 1024,
    blockingMs: 40 + at,
    longTasks: count,
    conditions: ON,
  }));

export const dropping = (...values: readonly number[]): readonly Gesture[] =>
  values.map((droppedFrames) => ({ droppedFrames, conditions: ON }));
