export interface Sample {
  readonly firstSeatGroupsMs: number;
  readonly lcp: number | null;
  readonly inp: number | null;
  readonly cls: number | null;
  readonly heapBytes: number | null;
  readonly conditions: string | null;
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  value instanceof Object;

const numberAt = (
  journey: Readonly<Record<string, unknown>>,
  axis: string,
): number | null => {
  const value = journey[axis];
  return typeof value === "number" ? value : null;
};

const sampleOf = (journey: unknown): Sample | null => {
  if (!isRecord(journey)) return null;
  const moment = numberAt(journey, "firstSeatGroupsMs");
  return moment === null
    ? null
    : {
        firstSeatGroupsMs: moment,
        lcp: numberAt(journey, "lcp"),
        inp: numberAt(journey, "inp"),
        cls: numberAt(journey, "cls"),
        heapBytes: numberAt(journey, "heapBytes"),
        conditions:
          typeof journey["conditions"] === "string"
            ? journey["conditions"]
            : null,
      };
};

export const samplesIn = (text: string): readonly Sample[] | null => {
  const journeys: unknown = JSON.parse(text);
  if (!Array.isArray(journeys)) return null;
  const samples = journeys.map(sampleOf);
  return samples.every((sample) => sample !== null) ? samples : null;
};

export const readingsOf = (
  samples: readonly Sample[],
  axis: (sample: Sample) => number | null,
): readonly number[] | null => {
  const readings = samples.map(axis);
  return readings.every((reading) => reading !== null) ? readings : null;
};

export const conditionsOf = (samples: readonly Sample[]): string | null => {
  const named = samples.map((sample) => sample.conditions);
  const first = named[0] ?? null;
  return named.every((conditions) => conditions === first) ? first : null;
};
