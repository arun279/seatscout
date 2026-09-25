import { Report } from "@perf-profiler/reporter";
import type { TestCaseResult } from "@perf-profiler/types";

export interface Reading {
  readonly iterations: number;
  readonly runtime: number;
  readonly runtimeSpread: number;
  readonly fps: number;
  readonly fpsSpread: number;
  readonly cpu: number;
  readonly cpuSpread: number;
  readonly ram: number;
  readonly ramSpread: number;
}

const isRun = (parsed: unknown): parsed is TestCaseResult =>
  typeof parsed === "object" &&
  parsed !== null &&
  "status" in parsed &&
  "iterations" in parsed &&
  Array.isArray(parsed.iterations);

const parsedFrom = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export const readingOf = (path: string, text: string): Reading | string => {
  const run = parsedFrom(text);
  if (!isRun(run)) return `${path} holds no Flashlight run`;
  if (run.status !== "SUCCESS")
    return `${path} records a Flashlight run that failed`;
  const report = new Report(run);
  if (!report.hasMeasures()) return `${path} measured no iteration`;
  const { runtime, fps, cpu, ram } = report.getAverageMetrics();
  const spread = report.getStats();
  if (fps === undefined || ram === undefined || !spread.fps || !spread.ram)
    return `${path} read no frame rate or memory`;
  return {
    iterations: report.getIterationCount(),
    runtime,
    runtimeSpread: spread.runtime.variationCoefficient,
    fps,
    fpsSpread: spread.fps.variationCoefficient,
    cpu,
    cpuSpread: spread.cpu.variationCoefficient,
    ram,
    ramSpread: spread.ram.variationCoefficient,
  };
};
