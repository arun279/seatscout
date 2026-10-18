import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const RUN = "https://github.com/owner/repo/actions/runs/1";

const reported = (planted: string) =>
  spawnSync(
    process.execPath,
    [
      "tools/mutation-findings/src/index.ts",
      `tools/mutation-findings/planted/${planted}`,
      RUN,
    ],
    { encoding: "utf8" },
  );

describe("the planted red under the mutation issue", () => {
  it("reports a surviving mutant for the issue, and exits 2 so the run opens it", () => {
    const run = reported("survived");

    expect(run.status).toBe(2);
    expect(run.stdout).toContain(
      "### `packages/core/src/up.ts:1` EqualityOperator survived",
    );
  });

  it("finds nothing in a run whose every mutant was killed, and exits 0 so the run closes the issue", () => {
    const run = reported("killed");

    expect(run.status).toBe(0);
    expect(run.stdout).toBe(
      "The tests killed all 1 mutants on this merge's lines.\n",
    );
  });

  it("reports a merge whose plan never arrived as broken", () => {
    const run = reported("never-planned");

    expect(run.status).toBe(2);
    expect(run.stdout).toContain("could not be made");
  });
});
