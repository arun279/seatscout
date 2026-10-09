import { describe, expect, it } from "vitest";
import { BIOME, OXLINT } from "./limits.js";
import { lines, measuring, reading, recorder } from "./measure.fixtures.js";
import {
  BIOME_REPORT,
  measureWith,
  OXLINT_REPORT,
  RATCHET,
} from "./measure.js";

describe("measuring a change", () => {
  it("names every file it reads a number or a path out of", () => {
    expect(RATCHET).toBe(".footprint.json");
    expect(OXLINT_REPORT).toBe(".oxlintrc.report.json");
    expect(BIOME_REPORT).toBe("biome.report.json");
  });

  it("resolves the head first, then the merge base against it", () => {
    const { run, commands } = recorder();

    measuring(run)("origin/main", "HEAD", "main", true);

    expect(lines(commands).slice(0, 2)).toStrictEqual([
      "git rev-parse HEAD",
      "git merge-base origin/main head-sha",
    ]);
  });

  it("counts each side and the diff between them over copies whose literals the parser has blanked, so a comment marker inside a string stays code", () => {
    const { run, commands } = recorder();

    measuring(run)("origin/main", "HEAD", "main", true);

    const said = lines(commands);
    expect(said.filter((line) => line === "mktemp -d")).toHaveLength(2);
    for (const [ref, at] of [
      ["base-sha", "/tmp/snapshot-1"],
      ["head-sha", "/tmp/snapshot-2"],
    ] as const) {
      expect(said).toContain(`git archive --format=tar -o ${at}.tar ${ref}`);
      expect(said).toContain(`tar -xf ${at}.tar -C ${at}`);
      expect(said.some((line) => line.endsWith(`blank-index.js ${at}`))).toBe(
        true,
      );
      expect(said).toContain(`cloc ${at} --by-file --json --hide-rate --quiet`);
    }
    expect(said).toContain(
      "cloc --diff /tmp/snapshot-1 /tmp/snapshot-2 --by-file --json --hide-rate --quiet",
    );
    expect(said).toContain(
      "rm -rf /tmp/snapshot-1 /tmp/snapshot-1.tar /tmp/snapshot-2 /tmp/snapshot-2.tar",
    );
  });

  it("asks size-limit to weigh this change and main's export, each by the configuration beside it", () => {
    const { run, commands } = recorder();

    measuring(run)("origin/main", "HEAD", "main", true);

    expect(lines(commands)).toContain(
      "pnpm exec size-limit --json --config .size-limit.json",
    );
    expect(lines(commands)).toContain(
      "pnpm exec size-limit --json --config main/.size-limit.json",
    );
  });

  it("asks each linter for the same rule again, at a threshold of one", () => {
    const { run, commands } = recorder();

    measuring(run)("origin/main", "HEAD", "main", true);

    expect(lines(commands)).toContain(
      `pnpm exec oxlint --config ${OXLINT_REPORT} --format json`,
    );
    expect(lines(commands)).toContain(
      `pnpm exec biome lint --config-path=${BIOME_REPORT} --only=complexity/noExcessiveCognitiveComplexity --only=style/noExcessiveLinesPerFile --reporter=json --max-diagnostics=none`,
    );
  });

  it("asks each runner to list its tests rather than to run them", () => {
    const { run, commands } = recorder();

    measuring(run)("origin/main", "HEAD", "main", true);

    expect(lines(commands)).toContain("pnpm exec vitest list --json");
    expect(lines(commands)).toContain(
      "pnpm exec playwright test --list --reporter=json",
    );
  });

  it("reads the limits from the files that gate them, not from the report pass", () => {
    const { run } = recorder();
    const { read, asked } = reading();

    const measurement = measureWith(run, read)(
      "origin/main",
      "HEAD",
      "main",
      true,
    );

    expect(measurement.gates).toStrictEqual({
      cyclomatic: 10,
      cognitive: 15,
      lines: 300,
    });
    expect(asked).toContain(OXLINT);
    expect(asked).toContain(BIOME);
  });

  it("carries the counter's numbers into the measurement, each file named by its path in the repository rather than in the copy", () => {
    const { run } = recorder();

    const measurement = measuring(run)("origin/main", "HEAD", "main", true);

    expect(measurement.base.ref).toBe("base-sha");
    expect(measurement.head.ref).toBe("head-sha");
    expect(measurement.head.tree).toStrictEqual({
      "packages/core/src/seat.ts": { code: 40, comment: 1 },
    });
    expect(measurement.diff).toStrictEqual({
      added: { "packages/core/src/new.ts": { code: 5, comment: 0 } },
      removed: { "packages/core/src/old.ts": { code: 2, comment: 0 } },
      modified: { "packages/core/src/seat.ts": { code: 3, comment: 1 } },
    });
    expect(measurement.bundles).toStrictEqual({
      kind: "weighed",
      bundles: [{ name: "app for iOS", main: 15, change: 15 }],
      globsChanged: false,
    });
  });

  it("carries each linter's highest reading into the measurement", () => {
    const { run } = recorder();

    const { limits } = measuring(run)("origin/main", "HEAD", "main", true);

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

  it("carries every test count", () => {
    const { run } = recorder();

    const measurement = measuring(run)("origin/main", "HEAD", "main", true);

    expect(measurement.suites).toStrictEqual({
      unit: 2,
      screens: 3,
      endToEnd: 1,
    });
  });

  it("names the command and repeats its complaint when one fails", () => {
    const { run } = recorder((command) =>
      command.command === "git" && command.args[0] === "rev-parse"
        ? { ok: false, stdout: "", stderr: "unknown revision" }
        : undefined,
    );

    expect(() => measuring(run)("origin/main", "HEAD", "main", true)).toThrow(
      "git rev-parse HEAD\nunknown revision",
    );
  });
});
