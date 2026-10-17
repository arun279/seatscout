import { main } from "./main.ts";

interface Ran {
  readonly code: number;
  readonly out: string;
  readonly err: string;
}

const measure = (fps: number, ui: number, js: number, ram: number) => ({
  cpu: { perName: { "UI Thread": ui, mqt_v_js: js }, perCore: {} },
  ram,
  fps,
  time: 500,
});

const iteration = (time: number, fps: number, ram: number) => ({
  time,
  status: "SUCCESS",
  measures: [measure(fps, 20, 10, ram), measure(fps, 40, 30, ram)],
});

const run = (...iterations: readonly object[]) =>
  JSON.stringify({ name: "run", status: "SUCCESS", iterations });

const times = (
  runtimes: readonly number[],
  fps: readonly number[] = [60, 60, 60],
  ram: readonly number[] = [100, 100, 100],
) =>
  run(
    ...runtimes.map((time, at) => iteration(time, fps[at] ?? 0, ram[at] ?? 0)),
  );

const medians = (time: number, fps: number, cpu: number, ram: number) =>
  run(
    ...Array.from({ length: 3 }, () => ({
      time,
      status: "SUCCESS",
      measures: [measure(fps, cpu, 0, ram)],
    })),
  );

const FILES: Readonly<Record<string, string>> = {
  "reference.json": medians(58531, 59.1, 15.6, 309.6),
  "docs-and-lint.json": medians(58531, 58.7, 20.9, 310.2),
  "text-size.json": medians(58531, 58.6, 15.6, 310.6),
  "action-pins.json": medians(57625, 59, 17, 308.4),
  "dev-tools.json": medians(58531, 58.5, 22.5, 313.9),
  "adr-links.json": medians(58531, 58.6, 22.7, 308.2),
  "three-fewer-frames.json": medians(58531, 56.1, 15.6, 309.6),
  "room-memory.json": medians(58531, 59.1, 15.6, 325),
  "walk-at-limit.json": medians(90107, 59.1, 15.6, 309.6),
  "walk-rounding-to-limit.json": medians(90107.4, 59.1, 15.6, 309.6),
  "walk-past-limit.json": medians(90107.5, 59.1, 15.6, 309.6),
  "frames-at-limit.json": medians(58531, 58.4, 15.6, 309.6),
  "frames-rounding-to-limit.json": medians(58531, 58.35, 15.6, 309.6),
  "frames-past-limit.json": medians(58531, 58.34, 15.6, 309.6),
  "cpu-at-limit.json": medians(58531, 59.1, 25.2, 309.6),
  "cpu-past-limit.json": medians(58531, 59.1, 25.3, 309.6),
  "memory-at-limit.json": medians(58531, 59.1, 15.6, 316.7),
  "memory-past-limit.json": medians(58531, 59.1, 15.6, 316.8),
  "head-walk.json": times([20000, 20400, 20200], [60, 60, 60], [200, 202, 201]),
  "base-walk.json": times([20100, 20500, 20300], [60, 60, 60], [200, 203, 201]),
  "fewer-frames.json": times(
    [20000, 20400, 20200],
    [55, 55, 55],
    [200, 202, 201],
  ),
  "slower-fewer.json": times(
    [52000, 52400, 52200],
    [55, 55, 55],
    [200, 202, 201],
  ),
  "unsteady-fewer.json": times(
    [10000, 30000, 20000],
    [55, 55, 55],
    [200, 202, 201],
  ),
  "edge-walk.json": times([19000, 21000], [60, 60], [200, 203]),
  "skewed-walk.json": times([20000, 20100, 20400]),
  "even-walk.json": times(
    [19000, 20000, 20200, 21000],
    [60, 60, 60, 60],
    [100, 100, 100, 100],
  ),
  "all-unsteady-walk.json": run(
    ...[
      [10000, 30, 100, 10],
      [30000, 90, 300, 30],
      [20000, 60, 200, 20],
    ].map(([time, fps, ram, cpu]) => ({
      time,
      status: "SUCCESS",
      measures: [
        { cpu: { perName: { ui: cpu }, perCore: {} }, fps, ram, time: 500 },
      ],
    })),
  ),
  "unsteady-walk.json": times(
    [10000, 30000, 20000],
    [60, 60, 60],
    [200, 202, 201],
  ),
  "no-cpu.json": run({
    time: 900,
    status: "SUCCESS",
    measures: [
      { cpu: { perName: {}, perCore: {} }, fps: 60, ram: 100, time: 500 },
    ],
  }),
  "walk-retried.json": run(
    iteration(20000, 60, 200),
    { ...iteration(90000, 60, 200), status: "FAILURE" },
    iteration(20400, 60, 200),
  ),
  "no-ram.json": run({
    time: 900,
    status: "SUCCESS",
    measures: [
      {
        cpu: { perName: { "UI Thread": 20 }, perCore: {} },
        fps: 60,
        time: 500,
      },
    ],
  }),
  "failed.json": JSON.stringify({
    name: "run",
    status: "FAILURE",
    iterations: [iteration(900, 60, 100)],
  }),
  "no-iteration.json": run(),
  "no-measure.json": run({ time: 900, status: "SUCCESS", measures: [] }),
  "one-unmeasured.json": run(iteration(900, 60, 100), {
    time: 900,
    status: "SUCCESS",
    measures: [],
  }),
  "no-frame.json": run({
    time: 900,
    status: "SUCCESS",
    measures: [
      { cpu: { perName: { "UI Thread": 20 }, perCore: {} }, time: 500 },
    ],
  }),
  "no-fps.json": run({
    time: 900,
    status: "SUCCESS",
    measures: [
      {
        cpu: { perName: { "UI Thread": 20 }, perCore: {} },
        ram: 100,
        time: 500,
      },
    ],
  }),
  "not-a-run.json": '{"lcp":1}',
  "not-json.json": "Flashlight crashed",
  "null.json": "null",
  "a-number.json": "5",
  "no-status.json": '{"iterations":[]}',
  "no-list.json": '{"status":"SUCCESS","iterations":{}}',
};

export const ran = (...argv: string[]): Ran => {
  const out: string[] = [];
  const err: string[] = [];
  const code = main(
    ["node", "device", ...argv],
    (path) => FILES[path] ?? null,
    { write: (text) => out.push(text) },
    { write: (text) => err.push(text) },
  );
  return { code, out: out.join(""), err: err.join("") };
};

export const heldWith = (swap: string, file: string): Ran =>
  ran(
    ...["--journey", "head-walk.json", "--previous", "base-walk.json"].map(
      (value, at, all) => (all[at - 1] === swap ? file : value),
    ),
  );
