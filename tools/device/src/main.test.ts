import { describe, expect, it } from "vitest";
import { main } from "./main.ts";

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

const FILES: Readonly<Record<string, string>> = {
  "head-startup.json": times([1000, 1020, 1010]),
  "head-walk.json": times([20000, 20400, 20200], [60, 60, 60], [200, 202, 201]),
  "base-startup.json": times([1000, 1030, 1015]),
  "base-walk.json": times([20100, 20500, 20300], [60, 60, 60], [200, 203, 201]),
  "slower-startup.json": times([1100, 1120, 1110]),
  "fewer-frames.json": times(
    [20000, 20400, 20200],
    [55, 55, 55],
    [200, 202, 201],
  ),
  "unsteady-startup.json": times([500, 1500, 1000]),
  "startup.json": run(iteration(900, 60, 100), iteration(1100, 60, 100)),
  "journey.json": run(iteration(20000, 60, 200), iteration(30000, 50, 300)),
  "startup-retried.json": run(
    iteration(900, 60, 100),
    { ...iteration(5000, 60, 100), status: "FAILURE" },
    iteration(1100, 60, 100),
  ),
  "startup-wide.json": run(iteration(500, 60, 100), iteration(1500, 60, 100)),
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

const ran = (...argv: string[]) => {
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

const held = (...argv: string[]) =>
  ran(
    "--head-startup",
    "head-startup.json",
    "--head-journey",
    "head-walk.json",
    "--base-startup",
    "base-startup.json",
    "--base-journey",
    "base-walk.json",
    ...argv,
  );

const heldWith = (swap: string, file: string) =>
  ran(
    ...[
      "--head-startup",
      "head-startup.json",
      "--head-journey",
      "head-walk.json",
      "--base-startup",
      "base-startup.json",
      "--base-journey",
      "base-walk.json",
    ].map((value, at, all) => (all[at - 1] === swap ? file : value)),
  );

describe("what the emulator measured, held to the merge base", () => {
  it("passes a branch no worse than the merge base's worst iteration on a steady runner, saying what it measured", () => {
    const report = held();

    expect(report.code).toBe(0);
    expect(report.err).toBe("");
    expect(report.out).toBe(
      [
        "### On the Android emulator",
        "",
        "Flashlight on one emulator, the merge base first, each over 3 iterations of start-up and 3 of the walk, with the app's data cleared before each. This branch's median over its iterations stands beside the merge base's worst; the spread is the standard deviation across iterations as a share of the mean.",
        "",
        "| Measure | This branch, median | Spread | Merge base, worst | Spread |",
        "| --- | --- | --- | --- | --- |",
        "| Start-up, launch to the first frame | 1010 ms | 0.8% | 1030 ms | 1.2% |",
        "| Walk, as Maestro makes it | 20200 ms | 0.8% | 20500 ms | 0.8% |",
        "| Frame rate over the walk | 60 FPS | 0% | 60 FPS | 0% |",
        "| CPU over the walk | 50% | 0% | 50% | 0% |",
        "| Memory over the walk | 201 MB | 0.4% | 203 MB | 0.6% |",
        "",
        "No figure is worse than the merge base's worst iteration, and the widest spread is 1.2%, under the 5 per cent Reassure calls steady.",
        "",
      ].join("\n"),
    );
  });

  it("fails a branch whose median is slower than the merge base's slowest iteration, naming the figure", () => {
    const report = heldWith("--head-startup", "slower-startup.json");

    expect(report.code).toBe(1);
    expect(report.out).toContain(
      "| Start-up, launch to the first frame | 1110 ms | 0.7% | 1030 ms | 1.2% |",
    );
    expect(report.out).toContain(
      "Worse than the merge base's worst iteration: Start-up, launch to the first frame.",
    );
  });

  it("holds a frame rate the other way, failing one below the merge base's lowest", () => {
    const report = heldWith("--head-journey", "fewer-frames.json");

    expect(report.code).toBe(1);
    expect(report.out).toContain(
      "Worse than the merge base's worst iteration: Frame rate over the walk.",
    );
  });

  it("asks for the reading again with more iterations when either side spread over 5 per cent", () => {
    const report = heldWith("--base-startup", "unsteady-startup.json");

    expect(report.code).toBe(3);
    expect(report.out).toContain(
      "The widest spread is 40.8%, over the 5 per cent Reassure calls steady, so the reading is taken again with twice the iterations.",
    );
  });

  it("fails as unmeasurable, never passes, when the second reading is still unsteady", () => {
    const report = ran(
      "--head-startup",
      "unsteady-startup.json",
      "--head-journey",
      "head-walk.json",
      "--base-startup",
      "base-startup.json",
      "--base-journey",
      "base-walk.json",
      "--last",
    );

    expect(report.code).toBe(1);
    expect(report.out).toContain(
      "Could not measure: the widest spread is still 40.8% with twice the iterations, over the 5 per cent Reassure calls steady.",
    );
  });

  it("reports the branch alone when the merge base has no walk to measure", () => {
    const report = ran(
      "--head-startup",
      "unsteady-startup.json",
      "--head-journey",
      "head-walk.json",
      "--no-baseline",
    );

    expect(report.code).toBe(0);
    expect(report.out).toContain("| Measure | This branch, median | Spread |");
    expect(report.out).toContain(
      "| Start-up, launch to the first frame | 1000 ms | 40.8% |",
    );
    expect(report.out).toContain(
      "The merge base has no walk to measure, so nothing here is held to one.",
    );
  });

  it("leaves out an iteration Flashlight marked failed", () => {
    expect(heldWith("--head-startup", "startup-retried.json").out).toContain(
      "| Start-up, launch to the first frame | 1000 ms | 10% |",
    );
  });

  it.each([
    ["missing.json", "missing.json was never written"],
    ["not-json.json", "not-json.json holds no JSON"],
    ["not-a-run.json", "not-a-run.json holds no Flashlight run"],
    ["null.json", "null.json holds no Flashlight run"],
    ["a-number.json", "a-number.json holds no Flashlight run"],
    ["no-status.json", "no-status.json holds no Flashlight run"],
    ["no-list.json", "no-list.json holds no Flashlight run"],
    ["failed.json", "failed.json records a Flashlight run that failed"],
    ["no-iteration.json", "no-iteration.json measured no iteration"],
    ["no-measure.json", "no-measure.json measured no iteration"],
    ["one-unmeasured.json", "one-unmeasured.json measured no iteration"],
    ["no-frame.json", "no-frame.json read no frame rate or memory"],
    ["no-ram.json", "no-ram.json read no frame rate or memory"],
    ["no-fps.json", "no-fps.json read no frame rate or memory"],
  ])("refuses %s rather than report over it", (journey, refusal) => {
    const report = heldWith("--head-journey", journey);

    expect(report.code).toBe(1);
    expect(report.out).toBe("");
    expect(report.err).toBe(`${refusal}\n`);
  });

  it.each(["--head-startup", "--base-startup", "--base-journey"])(
    "refuses a reading it cannot read wherever it was given, here %s",
    (flag) => {
      expect(heldWith(flag, "no-iteration.json").err).toBe(
        "no-iteration.json measured no iteration\n",
      );
    },
  );

  it.each([
    [["--head-startup", "a", "--head-journey", "b"]],
    [["--head-startup", "a", "--no-baseline"]],
    [["--head-journey", "b", "--no-baseline"]],
    [["--head-startup", "a", "--head-journey", "b", "--base-startup", "c"]],
    [
      [
        "--head-startup",
        "a",
        "--head-journey",
        "b",
        "--base-startup",
        "c",
        "--base-journey",
        "d",
        "--no-baseline",
      ],
    ],
    [[]],
  ])(
    "asks for each reading and a word about the merge base when given %j",
    (argv) => {
      const report = ran(...argv);

      expect(report.code).toBe(2);
      expect(report.err).toBe(
        "usage: device --head-startup <flashlight.json> --head-journey <flashlight.json> (--base-startup <flashlight.json> --base-journey <flashlight.json> | --no-baseline) [--last]\n",
      );
    },
  );
});
