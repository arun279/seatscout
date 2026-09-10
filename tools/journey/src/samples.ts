export interface Sample {
  readonly firstSeatGroupsMs: number;
  readonly lcp: number | null;
  readonly inp: number | null;
  readonly cls: number | null;
  readonly heapBytes: number | null;
  readonly blockingMs: number | null;
  readonly longTasks: number | null;
  readonly conditions: string | null;
}

export interface Gesture {
  readonly droppedFrames: number;
  readonly conditions: string | null;
}

export interface Measured {
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

const conditionsAt = (
  journey: Readonly<Record<string, unknown>>,
): string | null =>
  typeof journey["conditions"] === "string" ? journey["conditions"] : null;

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
        blockingMs: numberAt(journey, "blockingMs"),
        longTasks: numberAt(journey, "longTasks"),
        conditions: conditionsAt(journey),
      };
};

const gestureOf = (pass: unknown): Gesture | null => {
  if (!isRecord(pass)) return null;
  const dropped = numberAt(pass, "droppedFrames");
  return dropped === null
    ? null
    : { droppedFrames: dropped, conditions: conditionsAt(pass) };
};

const listOf = <Reading>(
  text: string,
  each: (entry: unknown) => Reading | null,
): readonly Reading[] | null => {
  const entries: unknown = JSON.parse(text);
  if (!Array.isArray(entries)) return null;
  const read = entries.map(each);
  return read.every((entry) => entry !== null) ? read : null;
};

export const samplesIn = (text: string): readonly Sample[] | null =>
  listOf(text, sampleOf);

export const gesturesIn = (text: string): readonly Gesture[] | null =>
  listOf(text, gestureOf);

export const readingsOf = <Reading>(
  samples: readonly Reading[],
  axis: (sample: Reading) => number | null,
): readonly number[] | null => {
  const readings = samples.map(axis);
  return readings.every((reading) => reading !== null) ? readings : null;
};

export const conditionsOf = (samples: readonly Measured[]): string | null => {
  const named = samples.map((sample) => sample.conditions);
  const first = named[0] ?? null;
  return named.every((conditions) => conditions === first) ? first : null;
};
