import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("the planted red under the mutation issue", () => {
  it("runs as a command that reports a surviving mutant and exits 2, so the run opens the issue", () => {
    const run = spawnSync(
      process.execPath,
      [
        "tools/mutation-findings/src/index.ts",
        "tools/mutation-findings/planted/survived",
        "https://github.com/owner/repo/actions/runs/1",
      ],
      { encoding: "utf8" },
    );

    expect(run.status).toBe(2);
    expect(run.stdout).toContain(
      "### `packages/core/src/up.ts:1` EqualityOperator survived",
    );
  });
});
