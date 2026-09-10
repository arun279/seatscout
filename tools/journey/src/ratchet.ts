import { conditionsOf, readingsOf, type Sample } from "./samples.ts";
import type { Verdict } from "./verdict.ts";

const median = (values: readonly number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = values.toSorted((a, b) => a - b);
  const upper = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const lower = sorted[Math.ceil(sorted.length / 2) - 1] ?? 0;
  return (upper + lower) / 2;
};

const ms = (value: number) => `${Math.round(value)} ms`;

const kib = (value: number) => `${Math.round(value / 1024)} KiB`;

const named = (samples: readonly Sample[]) => {
  const conditions = conditionsOf(samples);
  if (conditions !== null) return conditions;
  return samples.every((sample) => sample.conditions === null)
    ? "none recorded"
    : "disagreeing runs";
};

const momentsOf = (samples: readonly Sample[]) =>
  samples.map((sample) => sample.firstSeatGroupsMs);

export const judged = (
  head: readonly Sample[],
  base: readonly Sample[] | null,
): Verdict => {
  const typical = median(momentsOf(head));
  if (typical === null)
    return { passed: false, report: "the head measured no journey" };
  const measured = `the head's first Seat Groups took ${ms(typical)} in the median of ${head.length} journeys`;
  if (base === null)
    return {
      passed: true,
      report: `${measured}; there is no journey at the merge base to hold it to`,
    };
  if (base.length === 0)
    return { passed: false, report: "the merge base measured no journey" };
  const conditions = conditionsOf(head);
  if (conditions === null)
    return {
      passed: false,
      report: `${measured} under ${named(head)}; the head did not write down one set of conditions, so there is nothing to hold to the merge base`,
    };
  if (conditions !== conditionsOf(base))
    return {
      passed: true,
      report: `${measured} under ${conditions}; the merge base ran its journeys under ${named(base)}, which is not the same measurement to hold it to`,
    };
  const slowest = Math.max(...momentsOf(base));
  const against = `the merge base's slowest of ${base.length} journeys took ${ms(slowest)}`;
  return typical > slowest
    ? {
        passed: false,
        report: `${measured}, slower than every journey the merge base made: ${against}`,
      }
    : { passed: true, report: `${measured}; ${against}` };
};

const heapsOf = (samples: readonly Sample[]) =>
  readingsOf(samples, (sample) => sample.heapBytes);

export const heapReported = (
  head: readonly Sample[],
  base: readonly Sample[] | null,
): string => {
  const heaps = heapsOf(head);
  const typical = heaps === null ? null : median(heaps);
  if (typical === null) return "the head measured no JS heap";
  const measured = `the head's JS heap held ${kib(typical)} in the median of ${head.length} journeys`;
  if (base === null)
    return `${measured}; there is no journey at the merge base to compare it with`;
  const theirs = heapsOf(base);
  if (theirs === null || theirs.length === 0)
    return `${measured}; the merge base measured no JS heap`;
  return `${measured}; the merge base's largest of ${base.length} journeys held ${kib(Math.max(...theirs))}`;
};
