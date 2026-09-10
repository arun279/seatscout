import {
  conditionsOf,
  type Gesture,
  type Measured,
  readingsOf,
  type Sample,
} from "./samples.ts";
import type { Verdict } from "./verdict.ts";

interface Words {
  readonly of: string;
  readonly runs: string;
  readonly head: string;
  readonly base: string;
  readonly worst: string;
  readonly worse: string;
}

const median = (values: readonly number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = values.toSorted((a, b) => a - b);
  const upper = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const lower = sorted[Math.ceil(sorted.length / 2) - 1] ?? 0;
  return (upper + lower) / 2;
};

const ms = (value: number) => `${Math.round(value)} ms`;

const kib = (value: number) => `${Math.round(value / 1024)} KiB`;

const frames = (value: number) => `${value} frame(s)`;

const named = (samples: readonly Measured[]) => {
  const conditions = conditionsOf(samples);
  if (conditions !== null) return conditions;
  return samples.every((sample) => sample.conditions === null)
    ? "none recorded"
    : "disagreeing runs";
};

const heldToTheBase = <Reading extends Measured>(
  head: readonly Reading[],
  base: readonly Reading[] | null,
  axis: (sample: Reading) => number | null,
  said: (value: number) => string,
  words: Words,
): Verdict => {
  const ours = readingsOf(head, axis);
  const typical = ours === null ? null : median(ours);
  if (typical === null)
    return { passed: false, report: `the head measured no ${words.of}` };
  const measured = `the head's ${words.head} ${said(typical)} in the median of ${head.length} ${words.runs}`;
  if (base === null)
    return {
      passed: true,
      report: `${measured}; there is no ${words.of} at the merge base to hold it to`,
    };
  if (base.length === 0)
    return { passed: false, report: `the merge base measured no ${words.of}` };
  const theirs = readingsOf(base, axis);
  if (theirs === null)
    return {
      passed: true,
      report: `${measured}; the merge base wrote down no ${words.of} to hold it to`,
    };
  const conditions = conditionsOf(head);
  if (conditions === null)
    return {
      passed: false,
      report: `${measured} under ${named(head)}; the head did not write down one set of conditions, so there is nothing to hold to the merge base`,
    };
  if (conditions !== conditionsOf(base))
    return {
      passed: true,
      report: `${measured} under ${conditions}; the merge base ran its ${words.runs} under ${named(base)}, which is not the same measurement to hold it to`,
    };
  const worst = Math.max(...theirs);
  const against = `the merge base's ${words.worst} of ${base.length} ${words.runs} ${words.base} ${said(worst)}`;
  return typical > worst
    ? {
        passed: false,
        report: `${measured}, ${words.worse} than every ${words.of} the merge base made: ${against}`,
      }
    : { passed: true, report: `${measured}; ${against}` };
};

export const judged = (
  head: readonly Sample[],
  base: readonly Sample[] | null,
): Verdict =>
  heldToTheBase(head, base, (sample) => sample.firstSeatGroupsMs, ms, {
    of: "journey",
    runs: "journeys",
    head: "first Seat Groups took",
    base: "took",
    worst: "slowest",
    worse: "slower",
  });

const BLOCKING_IS_GOOD_AT = 200;

export const blockingJudged = (
  head: readonly Sample[],
  base: readonly Sample[] | null,
): Verdict =>
  heldToTheBase(head, base, (sample) => sample.blockingMs, ms, {
    of: "blocking",
    runs: "journeys",
    head: "long tasks blocked the main thread for",
    base: "blocked for",
    worst: "worst",
    worse: "more blocking",
  });

export const blockingReported = (head: readonly Sample[]): string => {
  const blocking = readingsOf(head, (sample) => sample.blockingMs);
  const tasks = readingsOf(head, (sample) => sample.longTasks);
  const typical = blocking === null ? null : median(blocking);
  if (typical === null || tasks === null)
    return "the head measured no long task";
  return `the head ran ${Math.max(...tasks)} long tasks at their worst, each over the 50 ms the W3C Long Tasks API defines one at, blocking for ${ms(typical)} in the median of ${head.length} journeys against the ${BLOCKING_IS_GOOD_AT} ms web.dev publishes as good on average mobile hardware; nothing here gates on that threshold, because this runner applies no CPU multiplier`;
};

export const framesJudged = (
  head: readonly Gesture[],
  base: readonly Gesture[] | null,
): Verdict =>
  heldToTheBase(head, base, (pass) => pass.droppedFrames, frames, {
    of: "gesture",
    runs: "gestures",
    head: "gesture dropped",
    base: "dropped",
    worst: "worst",
    worse: "more dropped frames",
  });

export const heapReported = (
  head: readonly Sample[],
  base: readonly Sample[] | null,
): string => {
  const heaps = readingsOf(head, (sample) => sample.heapBytes);
  const typical = heaps === null ? null : median(heaps);
  if (typical === null) return "the head measured no JS heap";
  const measured = `the head's JS heap held ${kib(typical)} in the median of ${head.length} journeys`;
  if (base === null)
    return `${measured}; there is no journey at the merge base to compare it with`;
  const theirs = readingsOf(base, (sample) => sample.heapBytes);
  if (theirs === null || theirs.length === 0)
    return `${measured}; the merge base measured no JS heap`;
  return `${measured}; the merge base's largest of ${base.length} journeys held ${kib(Math.max(...theirs))}`;
};
