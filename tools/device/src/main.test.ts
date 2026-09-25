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
  it("reports start-up and the journey from Flashlight's own averages and spreads", () => {
    const report = ran(
      "--startup",
      "startup.json",
      "--journey",
      "journey.json",
    );

    expect(report.code).toBe(0);
    expect(report.err).toBe("");
    expect(report.out).toContain(
      "| Start-up, to the first frame | 1000 ms | 10% |",
    );
    expect(report.out).toContain(
      "| Journey, from a cold start | 25000 ms | 20% |",
    );
    expect(report.out).toContain(
      "| Frame rate over the journey | 55 FPS | 9.1% |",
    );
    expect(report.out).toContain("| CPU over the journey | 50% | 0% |");
    expect(report.out).toContain("| Memory over the journey | 250 MB | 20% |");
    expect(report.out).toContain(
      "2 iterations of start-up and 2 of the journey",
    );
  });

  it("names the widest spread, since that is what decides whether a regression could gate", () => {
    expect(
      ran("--startup", "startup.json", "--journey", "journey.json").out,
    ).toContain("The widest spread across iterations is 20%");
  });

  it.each([
    ["missing.json", "missing.json was never written"],
    ["not-json.json", "not-json.json holds no Flashlight run"],
    ["not-a-run.json", "not-a-run.json holds no Flashlight run"],
    ["null.json", "null.json holds no Flashlight run"],
    ["a-number.json", "a-number.json holds no Flashlight run"],
    ["no-status.json", "no-status.json holds no Flashlight run"],
    ["no-list.json", "no-list.json holds no Flashlight run"],
    ["failed.json", "failed.json records a Flashlight run that failed"],
    ["no-iteration.json", "no-iteration.json measured no iteration"],
    ["no-measure.json", "no-measure.json measured no iteration"],
    ["no-frame.json", "no-frame.json read no frame rate or memory"],
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
