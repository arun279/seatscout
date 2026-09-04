interface Verdict {
  readonly passed: boolean;
  readonly report: string;
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  value instanceof Object;

const momentOf = (journey: unknown): number | null =>
  isRecord(journey) && typeof journey.firstSeatGroupsMs === "number"
    ? journey.firstSeatGroupsMs
    : null;

const momentsOf = (journeys: unknown): readonly number[] | null => {
  if (!Array.isArray(journeys)) return null;
  const moments = journeys.map(momentOf);
  return moments.every((moment) => moment !== null) ? moments : null;
};

export const firstSeatGroupsIn = (text: string): readonly number[] | null =>
  momentsOf(JSON.parse(text));

const median = (values: readonly number[]): number => {
  const sorted = values.toSorted((a, b) => a - b);
  const upper = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const lower = sorted[Math.ceil(sorted.length / 2) - 1] ?? 0;
  return (upper + lower) / 2;
};

const ms = (value: number) => `${Math.round(value)} ms`;

export const judged = (
  head: readonly number[],
  base: readonly number[] | null,
): Verdict => {
  if (head.length === 0)
    return { passed: false, report: "the head measured no journey" };
  const typical = median(head);
  const measured = `the head's first Seat Groups took ${ms(typical)} in the median of ${head.length} journeys`;
  if (base === null)
    return {
      passed: true,
      report: `${measured}; there is no journey at the merge base to hold it to`,
    };
  if (base.length === 0)
    return { passed: false, report: "the merge base measured no journey" };
  const slowest = Math.max(...base);
  const against = `the merge base's slowest of ${base.length} journeys took ${ms(slowest)}`;
  return typical > slowest
    ? {
        passed: false,
        report: `${measured}, slower than every journey the merge base made: ${against}`,
      }
    : { passed: true, report: `${measured}; ${against}` };
};
