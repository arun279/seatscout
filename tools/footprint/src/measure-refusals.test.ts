import { describe, expect, it } from "vitest";
import { BIOME, OXLINT } from "./limits.js";
import { measuring, recorder } from "./measure.fixtures.js";
import { RATCHET, STRYKER } from "./measure.js";
import type { Run } from "./shell.js";

const sizeLimitExitingNonZero = (stdout: string): Run =>
  recorder((command) =>
    command.command === "pnpm" && command.args[1] === "size-limit"
      ? { ok: false, stdout, stderr: "" }
      : undefined,
  ).run;

const measured = (over: Record<string, string>) => () =>
  measuring(recorder().run, over)("origin/main", "HEAD");

describe("what size-limit reported", () => {
  it("reads the bundle verdict even when size-limit exits non-zero", () => {
    const run = sizeLimitExitingNonZero(
      JSON.stringify([
        { name: "web app", size: 90, sizeLimit: 15, passed: false },
      ]),
    );

    expect(measuring(run)("origin/main", "HEAD").bundles).toStrictEqual([
      { name: "web app", size: 90, sizeLimit: 15, passed: false },
    ]);
  });

  it("refuses the verdict a glob matching nothing reports, which passes at no ratchet", () => {
    const run = sizeLimitExitingNonZero(
      JSON.stringify([{ name: "web app", passed: true, size: 0 }]),
    );

    expect(() => measuring(run)("origin/main", "HEAD")).toThrow(
      'size-limit weighed no bundle against a ratchet:\n[{"name":"web app","passed":true,"size":0}]',
    );
  });

  it("refuses a list where one bundle was weighed and another was not", () => {
    const run = sizeLimitExitingNonZero(
      JSON.stringify([
        { name: "web app", size: 15, sizeLimit: 15, passed: true },
        { name: "proxy", passed: true, size: 0 },
      ]),
    );

    expect(() => measuring(run)("origin/main", "HEAD")).toThrow(
      "size-limit weighed no bundle against a ratchet",
    );
  });

  it("refuses a run that weighed no bundle at all", () => {
    const run = sizeLimitExitingNonZero("[]");

    expect(() => measuring(run)("origin/main", "HEAD")).toThrow(
      "size-limit weighed no bundle against a ratchet",
    );
  });

  it("refuses size-limit's error object, which is not a list of bundles", () => {
    const run = sizeLimitExitingNonZero(
      '{"error":"SizeLimitError: config is empty"}',
    );

    expect(() => measuring(run)("origin/main", "HEAD")).toThrow(
      "size-limit weighed no bundle against a ratchet",
    );
  });
});

describe("the ratchets the tree is held to", () => {
  it("reads both numbers out of the one file that holds them", () => {
    const { ratchets } = measuring(recorder().run, {
      [RATCHET]: JSON.stringify({ comments: 7, tests: 486 }),
    })("origin/main", "HEAD");

    expect(ratchets).toStrictEqual({ comments: 7, tests: 486 });
  });

  it("refuses a ratchet file that sets no number of comments", () => {
    expect(measured({ [RATCHET]: JSON.stringify({ tests: 1 }) })).toThrow(
      `${RATCHET} sets no number of comments to hold the tree to`,
    );
  });

  it("refuses a comment ratchet that is not a number", () => {
    expect(
      measured({ [RATCHET]: JSON.stringify({ comments: "none", tests: 1 }) }),
    ).toThrow(`${RATCHET} sets no number of comments to hold the tree to`);
  });

  it("refuses a ratchet file that sets no number of tests", () => {
    expect(measured({ [RATCHET]: JSON.stringify({ comments: 0 }) })).toThrow(
      `${RATCHET} sets no number of tests to hold the tree to`,
    );
  });
});

describe("the limits the report stands its figures beside", () => {
  it("refuses a linter configuration that sets no cyclomatic limit", () => {
    expect(measured({ [OXLINT]: JSON.stringify({ rules: {} }) })).toThrow(
      `${OXLINT} sets no cyclomatic complexity limit`,
    );
  });

  it("refuses a linter configuration that sets no cognitive limit", () => {
    expect(
      measured({
        [BIOME]: JSON.stringify({
          linter: {
            rules: {
              style: {
                noExcessiveLinesPerFile: { options: { maxLines: 300 } },
              },
            },
          },
        }),
      }),
    ).toThrow(`${BIOME} sets no cognitive complexity limit`);
  });

  it("refuses a linter configuration that sets no line limit", () => {
    expect(
      measured({
        [BIOME]: JSON.stringify({
          linter: {
            rules: {
              complexity: {
                noExcessiveCognitiveComplexity: {
                  options: { maxAllowedComplexity: 15 },
                },
              },
            },
          },
        }),
      }),
    ).toThrow(`${BIOME} sets no lines per file limit`);
  });
});

describe("the mutation report", () => {
  it("refuses a runner configuration that names no json report", () => {
    expect(measured({ [STRYKER]: JSON.stringify({ reporters: [] }) })).toThrow(
      `${STRYKER} names no json report, so no mutation run wrote a score to read.`,
    );
  });
});
