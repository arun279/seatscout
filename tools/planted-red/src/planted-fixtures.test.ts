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
  it("runs no gate at all over a fixture the tree no longer carries", () => {
    let reached = false;

    expect(() =>
      overPlanted("no-such-gate", () => {
        reached = true;
        return 0;
      }),
    ).toThrow();
    expect(reached).toBe(false);
  });

  it("runs none over a fixture directory that plants no file either", () => {
    const from = nothingPlantedIn("emptied");
    let reached = false;

    expect(() =>
      overPlanted(
        "emptied",
        () => {
          reached = true;
          return 0;
        },
        from,
      ),
    ).toThrow("plants no file to run a gate over");
    expect(reached).toBe(false);

    rmSync(from, { recursive: true, force: true });
  });
});
