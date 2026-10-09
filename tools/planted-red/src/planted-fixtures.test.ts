import { chmodSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, onTestFinished } from "vitest";
import {
  APP_SOURCE,
  biomeIn,
  IGNORED,
  overPlanted,
  said,
} from "./planted.fixtures.ts";

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
        { from },
      ),
    ).toThrow("plants no file to run a gate over");
    expect(reached).toBe(false);

    rmSync(from, { recursive: true, force: true });
  });

  it("lints a planted copy without reading the copies beside it, which other tests make and delete while it runs", () => {
    mkdirSync(IGNORED, { recursive: true });
    const beside = mkdtempSync(join(IGNORED, "unreadable-"));
    chmodSync(beside, 0o000);
    onTestFinished(() => {
      chmodSync(beside, 0o700);
      rmSync(beside, { recursive: true, force: true });
    });

    const run = overPlanted(
      "ids",
      (at) => biomeIn(at, join(APP_SOURCE, "written.tsx")),
      { beneath: APP_SOURCE },
    );

    expect(run.status).toBe(1);
    expect(said(run)).toContain("This id is a literal");
  });
});
