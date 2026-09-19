import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { reading, recorder } from "./measure.fixtures.js";
import { measureWith, SHARDS } from "./measure.js";

const PLANTED = "tools/footprint/planted";

const planted = (name: string): string =>
  readFileSync(`${PLANTED}/${name}`, "utf8");

const INNOCENT: Record<string, string> = {
  oxlint: "oxlint-one.json",
  biome: "biome-one.json",
  vitest: "vitest-one.json",
  jest: "jest-one.json",
  playwright: "playwright-one.json",
};

const judging = (...reports: readonly string[]) => ({
  [SHARDS]: JSON.stringify(
    reports.map((report, index) => ({
      workspace: `packages/planted-${index}`,
      report: `${PLANTED}/${report}`,
    })),
  ),
  ...Object.fromEntries(
    reports.map((report) => [`${PLANTED}/${report}`, planted(report)]),
  ),
});

const measuring = (
  swapped: Record<string, string> = {},
  ...reports: readonly string[]
) => {
  const named = { ...INNOCENT, ...swapped };
  const { run } = recorder((command) => {
    const fixture =
      command.command === "pnpm" ? named[command.args[1] ?? ""] : undefined;
    return fixture === undefined
      ? undefined
      : { ok: true, stdout: planted(fixture), stderr: "" };
  });
  const { read } = reading(
    judging(...(reports.length > 0 ? reports : ["mutation-one.json"])),
  );
  return () => measureWith(run, read)("origin/main", "HEAD");
};

describe("the planted red", () => {
  it("refuses a branching pass that scored no function", () => {
    expect(measuring({ oxlint: "oxlint-nothing.json" })).toThrow(
      "The report-only pass scored no function for branching",
    );
  });

  it("refuses a pass that scored no function for understandability", () => {
    expect(measuring({ biome: "biome-nothing.json" })).toThrow(
      "The report-only pass scored no function for understandability",
    );
  });

  it("refuses a pass that counted the lines of no file", () => {
    expect(measuring({ biome: "biome-no-file.json" })).toThrow(
      "The report-only pass scored no file for its length",
    );
  });

  it("refuses a unit listing that collected no test", () => {
    expect(measuring({ vitest: "vitest-nothing.json" })).toThrow(
      "Vitest collected no test at all",
    );
  });

  it("refuses a screen run that collected no test", () => {
    expect(measuring({ jest: "jest-nothing.json" })).toThrow(
      "Jest collected no test at all",
    );
  });

  it("refuses an end to end listing that collected no test", () => {
    expect(measuring({ playwright: "playwright-nothing.json" })).toThrow(
      "Playwright collected no test at all",
    );
  });

  it("refuses a shard whose every mutant was ignored or would not compile", () => {
    expect(measuring({}, "mutation-nothing.json")).toThrow(
      "The mutation run weighed no mutant",
    );
  });

  it("refuses a later shard that weighed nothing behind one that weighed something", () => {
    expect(measuring({}, "mutation-one.json", "mutation-nothing.json")).toThrow(
      "The mutation run weighed no mutant",
    );
  });

  it("accepts the set that measured something, so it is not refusing everything", () => {
    const measurement = measuring()();

    expect(measurement.limits.cyclomatic.value).toBe(9);
    expect(measurement.limits.cognitive.value).toBe(14);
    expect(measurement.limits.longest.value).toBe(297);
    expect(measurement.suites).toStrictEqual({
      unit: 1,
      screens: 1,
      endToEnd: 1,
    });
    expect(measurement.mutation.map((run) => run.weighed)).toStrictEqual([1]);
  });
});
