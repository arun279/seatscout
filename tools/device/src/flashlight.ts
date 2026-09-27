interface Measure {
  readonly cpu: { readonly perName: Readonly<Record<string, number>> };
  readonly fps?: number;
  readonly ram?: number;
}

interface Iteration {
  readonly time: number;
  readonly status: string;
  readonly measures: readonly Measure[];
}

interface Run {
  readonly status: string;
  readonly iterations: readonly Iteration[];
}

export interface Figure {
  readonly values: readonly number[];
  readonly median: number;
  readonly spread: number;
}

export interface Reading {
  readonly iterations: number;
  readonly runtime: Figure;
  readonly fps: Figure;
  readonly cpu: Figure;
  readonly ram: Figure;
}

const NO_JSON: unique symbol = Symbol();

const isRun = (parsed: unknown): parsed is Run =>
  typeof parsed === "object" &&
  parsed !== null &&
  "status" in parsed &&
  "iterations" in parsed &&
  Array.isArray(parsed.iterations);

const parsedFrom = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return NO_JSON;
  }
};

const sumOf = (values: readonly number[]) =>
  values.reduce((sum, value) => sum + value, 0);

const meanOf = (values: readonly number[]) => sumOf(values) / values.length;

export const tenths = (value: number): number => Math.round(value * 10) / 10;

const medianOf = (values: readonly number[]) => {
  const sorted = values.toSorted((one, other) => one - other);
  const middle = sorted.length / 2;
  return meanOf(sorted.slice(Math.ceil(middle) - 1, Math.floor(middle) + 1));
};

const figureOf = (values: readonly number[]): Figure => {
  const mean = meanOf(values);
  const deviation = Math.sqrt(
    meanOf(values.map((value) => (value - mean) ** 2)),
  );
  return {
    values,
    median: tenths(medianOf(values)),
    spread: tenths((deviation / mean) * 100),
  };
};

const each = (
  iterations: readonly Iteration[],
  read: (measure: Measure) => number | undefined,
): readonly number[] =>
  iterations.map((iteration) =>
    meanOf(iteration.measures.map((measure) => read(measure) ?? Number.NaN)),
  );

export const readingOf = (path: string, text: string): Reading | string => {
  const run = parsedFrom(text);
  if (run === NO_JSON) return `${path} holds no JSON`;
  if (!isRun(run)) return `${path} holds no Flashlight run`;
  if (run.status !== "SUCCESS")
    return `${path} records a Flashlight run that failed`;
  const measured = run.iterations.filter(
    (iteration) => iteration.status === "SUCCESS",
  );
  if (
    measured.length === 0 ||
    measured.some((iteration) => iteration.measures.length === 0)
  )
    return `${path} measured no iteration`;
  const fps = each(measured, (measure) => measure.fps);
  const ram = each(measured, (measure) => measure.ram);
  if ([...fps, ...ram].some(Number.isNaN))
    return `${path} read no frame rate or memory`;
  const reading = {
    iterations: measured.length,
    runtime: figureOf(measured.map((iteration) => iteration.time)),
    fps: figureOf(fps),
    cpu: figureOf(
      each(measured, (measure) => sumOf(Object.values(measure.cpu.perName))),
    ),
    ram: figureOf(ram),
  };
  return [reading.runtime, reading.fps, reading.cpu, reading.ram].some(
    (figure) => Number.isNaN(figure.spread),
  )
    ? `${path} read a figure that was nothing on every iteration`
    : reading;
};
