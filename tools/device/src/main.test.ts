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

const FILES: Readonly<Record<string, string>> = {
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

describe("what the emulator measured", () => {
  it("reports start-up and the journey as the mean over iterations and their spread", () => {
    const report = ran(
      "--startup",
      "startup.json",
      "--journey",
      "journey.json",
    );

    expect(report.code).toBe(0);
    expect(report.err).toBe("");
    expect(report.out).toBe(
      [
        "### On the Android emulator",
        "",
        "Flashlight over 2 iterations of start-up and 2 of the journey, with the app's data cleared before each. Each figure is the mean over iterations; the spread is the standard deviation across iterations as a share of that mean.",
        "",
        "| Measure | Mean | Spread |",
        "| --- | --- | --- |",
        "| Start-up, launch to the first frame | 1000 ms | 10% |",
        "| Journey, as Maestro walks it | 25000 ms | 20% |",
        "| Frame rate over the journey | 55 FPS | 9.1% |",
        "| CPU over the journey | 50% | 0% |",
        "| Memory over the journey | 250 MB | 20% |",
        "",
        "The widest spread across iterations is 20%.",
        "",
      ].join("\n"),
    );
  });

  it("leaves out an iteration Flashlight marked failed", () => {
    expect(
      ran("--startup", "startup-retried.json", "--journey", "journey.json").out,
    ).toContain("| Start-up, launch to the first frame | 1000 ms | 10% |");
  });

  it("names the widest spread wherever it falls", () => {
    expect(
      ran("--startup", "startup-wide.json", "--journey", "journey.json").out,
    ).toContain("The widest spread across iterations is 50%.");
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
    ["no-frame.json", "no-frame.json read no frame rate or memory"],
    ["no-ram.json", "no-ram.json read no frame rate or memory"],
    ["no-fps.json", "no-fps.json read no frame rate or memory"],
  ])("refuses %s rather than report over it", (journey, refusal) => {
    const report = ran("--startup", "startup.json", "--journey", journey);

    expect(report.code).toBe(1);
    expect(report.out).toBe("");
    expect(report.err).toBe(`${refusal}\n`);
  });

  it("refuses a start-up it cannot read as it refuses a journey", () => {
    expect(
      ran("--startup", "no-iteration.json", "--journey", "journey.json").err,
    ).toBe("no-iteration.json measured no iteration\n");
  });

  it.each([
    [["--startup", "startup.json"]],
    [["--journey", "journey.json"]],
    [[]],
  ])("asks for both runs when given %j", (argv) => {
    const report = ran(...argv);

    expect(report.code).toBe(2);
    expect(report.err).toBe(
      "usage: device --startup <flashlight.json> --journey <flashlight.json>\n",
    );
  });
});
