import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { IGNORED, overPlanted } from "./planted.fixtures.ts";

const nothingPlantedIn = (fixture: string) => {
  mkdirSync(IGNORED, { recursive: true });
  const from = mkdtempSync(join(IGNORED, "nothing-"));
  mkdirSync(join(from, fixture));
  return from;
};

describe("the fixtures the planted reds are run over", () => {
  it("refuses a fixture the tree no longer carries, rather than running a gate over nothing", () => {
    expect(() => overPlanted("no-such-gate", () => 0)).toThrow("no-such-gate");
  });

  it("refuses a fixture directory that plants no file, for the same reason", () => {
    const from = nothingPlantedIn("emptied");

    expect(() => overPlanted("emptied", () => 0, from)).toThrow(
      "plants no file to run a gate over",
    );

    rmSync(from, { recursive: true, force: true });
  });
});
