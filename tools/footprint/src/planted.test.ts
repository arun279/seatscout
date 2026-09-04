import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { reading, recorder } from "./measure.fixtures.js";
import { measureWith, STRYKER } from "./measure.js";

const PLANTED = "tools/footprint/planted";

const planted = (name: string): string =>
  readFileSync(`${PLANTED}/${name}`, "utf8");

const INNOCENT: Record<string, string> = {
  oxlint: "oxlint-one.json",
  biome: "biome-one.json",
  vitest: "vitest-one.json",
  playwright: "playwright-one.json",
};

const measuring = (
  swapped: Record<string, string> = {},
  report = "mutation-one.json",
) => {
  const named = { ...INNOCENT, ...swapped };
  const { run } = recorder((command) => {
    const fixture =
      command.command === "pnpm" ? named[command.args[1] ?? ""] : undefined;
    return fixture === undefined
      ? undefined
      : { ok: true, stdout: planted(fixture), stderr: "" };
  });
  const where = `${PLANTED}/${report}`;
  const { read } = reading({
    [STRYKER]: JSON.stringify({ jsonReporter: { fileName: where } }),
    [where]: planted(report),
  });
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

  it("refuses an end to end listing that collected no test", () => {
    expect(measuring({ playwright: "playwright-nothing.json" })).toThrow(
      "Playwright collected no test at all",
    );
  });

  it("refuses a mutation run whose every mutant was ignored or would not compile", () => {
    expect(measuring({}, "mutation-nothing.json")).toThrow(
      "The mutation run weighed no mutant",
    );
  });

  it("accepts the set that measured something, so it is not refusing everything", () => {
    const measurement = measuring()();

    expect(measurement.limits.cyclomatic.value).toBe(9);
    expect(measurement.limits.cognitive.value).toBe(14);
    expect(measurement.limits.longest.value).toBe(297);
    expect(measurement.suites).toStrictEqual({ unit: 1, endToEnd: 1 });
    expect(measurement.mutation.weighed).toBe(1);
  });
});
