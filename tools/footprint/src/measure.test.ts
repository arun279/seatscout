import { describe, expect, it } from "vitest";
import { BIOME, OXLINT } from "./limits.js";
import {
  lines,
  MUTATION_REPORT,
  measuring,
  reading,
  recorder,
} from "./measure.fixtures.js";
import {
  BIOME_REPORT,
  measureWith,
  OXLINT_REPORT,
  RATCHET,
} from "./measure.js";

describe("measuring a change", () => {
  it("reads the ratchets out of the file that holds them", () => {
    expect(RATCHET).toBe(".footprint.json");
  });

  it("resolves the head first, then the merge base against it", () => {
    const { run, commands } = recorder();

    measuring(run)("origin/main", "HEAD");

    expect(lines(commands).slice(0, 2)).toStrictEqual([
      "git rev-parse HEAD",
      "git merge-base origin/main head-sha",
    ]);
  });

  it("counts each side and the diff between them", () => {
    const { run, commands } = recorder();

    measuring(run)("origin/main", "HEAD");

    expect(lines(commands)).toContain(
      "cloc --git base-sha --by-file --json --hide-rate --quiet",
    );
    expect(lines(commands)).toContain(
      "cloc --git head-sha --by-file --json --hide-rate --quiet",
    );
    expect(lines(commands)).toContain(
      "cloc --git --diff base-sha head-sha --by-file --json --hide-rate --quiet",
    );
  });

  it("asks size-limit for its verdict as machine readable output", () => {
    const { run, commands } = recorder();

    measuring(run)("origin/main", "HEAD");

    expect(lines(commands)).toContain("pnpm exec size-limit --json");
  });

  it("asks each linter for the same rule again, at a threshold of one", () => {
    const { run, commands } = recorder();

    measuring(run)("origin/main", "HEAD");

    expect(lines(commands)).toContain(
      `pnpm exec oxlint --config ${OXLINT_REPORT} --format json`,
    );
    expect(lines(commands)).toContain(
      `pnpm exec biome lint --config-path=${BIOME_REPORT} --only=complexity/noExcessiveCognitiveComplexity --only=style/noExcessiveLinesPerFile --reporter=json --max-diagnostics=none`,
    );
  });

  it("asks each runner to list its tests rather than to run them", () => {
    const { run, commands } = recorder();

    measuring(run)("origin/main", "HEAD");

    expect(lines(commands)).toContain("pnpm exec vitest list --json");
    expect(lines(commands)).toContain(
      "pnpm exec playwright test --list --reporter=json",
    );
  });

  it("reads the limits from the files that gate them, not from the report pass", () => {
    const { run } = recorder();
    const { read, asked } = reading();

    const measurement = measureWith(run, read)("origin/main", "HEAD");

    expect(measurement.gates).toStrictEqual({
      cyclomatic: 10,
      cognitive: 15,
      lines: 300,
    });
    expect(asked).toContain(OXLINT);
    expect(asked).toContain(BIOME);
  });

  it("carries the counter's numbers into the measurement", () => {
    const { run } = recorder();

    const measurement = measuring(run)("origin/main", "HEAD");

    expect(measurement.base.ref).toBe("base-sha");
    expect(measurement.head.ref).toBe("head-sha");
    expect(measurement.head.tree).toStrictEqual({
      "packages/core/src/seat.ts": { code: 40, comment: 1 },
    });
    expect(measurement.diff.added).toStrictEqual({
      "packages/core/src/seat.ts": { code: 5, comment: 0 },
    });
    expect(measurement.bundles).toStrictEqual([
      { name: "web app", size: 15, sizeLimit: 15, passed: true },
    ]);
  });

  it("carries each linter's highest reading into the measurement", () => {
    const { run } = recorder();

    const { limits } = measuring(run)("origin/main", "HEAD");

    expect(limits.cyclomatic).toStrictEqual({
      value: 9,
      at: "`packages/core/src/read.ts:41` `read`",
    });
    expect(limits.cognitive).toStrictEqual({
      value: 14,
      at: "`tools/corpus-rows.mjs:39`",
    });
    expect(limits.longest).toStrictEqual({
      value: 297,
      at: "`packages/core/src/map.test.ts`",
    });
  });

  it("carries both test counts and the score of the run that was recorded", () => {
    const { run } = recorder();

    const measurement = measuring(run)("origin/main", "HEAD");

    expect(measurement.suites).toStrictEqual({ unit: 2, endToEnd: 1 });
    expect(measurement.mutation).toStrictEqual({
      score: 100,
      detected: 1,
      weighed: 1,
      breaksAt: 100,
    });
  });

  it("reads the mutation report from wherever the runner was told to write it", () => {
    const { run } = recorder();
    const { read, asked } = reading();

    measureWith(run, read)("origin/main", "HEAD");

    expect(asked).toContain(MUTATION_REPORT);
  });

  it("names the command and repeats its complaint when one fails", () => {
    const { run } = recorder((command) =>
      command.command === "git" && command.args[0] === "rev-parse"
        ? { ok: false, stdout: "", stderr: "unknown revision" }
        : undefined,
    );

    expect(() => measuring(run)("origin/main", "HEAD")).toThrow(
      "git rev-parse HEAD\nunknown revision",
    );
  });
});
