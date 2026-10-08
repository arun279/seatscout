import { describe, expect, it } from "vitest";
import { BIOME, OXLINT } from "./limits.js";
import { measuring, recorder } from "./measure.fixtures.js";
import { RATCHET } from "./measure.js";
import type { Run } from "./shell.js";

const measured = (over: Record<string, string>) => () =>
  measuring(recorder().run, over)("origin/main", "HEAD", "main");

describe("what size-limit reported", () => {
  const weighing = (byConfig: Record<string, unknown>): Run =>
    recorder((command) => {
      if (command.command !== "pnpm" || command.args[1] !== "size-limit")
        return undefined;
      const config = command.args[command.args.indexOf("--config") + 1] ?? "";
      return {
        ok: false,
        stdout: JSON.stringify(byConfig[config]),
        stderr: "",
      };
    }).run;

  const IOS = { name: "app for iOS", size: 15 };

  it("weighs main by the configuration in its tree and this change by its own, whatever size-limit exits", () => {
    const run = weighing({
      ".size-limit.json": [{ ...IOS, size: 90 }],
      "main/.size-limit.json": [IOS],
    });

    expect(measuring(run)("origin/main", "HEAD", "main").bundles).toStrictEqual(
      [{ name: "app for iOS", main: 15, change: 90 }],
    );
  });

  it.each([
    [
      "a glob matching nothing, which size-limit passes at 0 B",
      [{ ...IOS, size: 0 }],
    ],
    ["a bundle with no size", [{ name: "app for iOS" }]],
    ["a bundle with no name", [{ size: 15 }]],
    ["no bundle at all", []],
    ["size-limit's error object", { error: "SizeLimitError: config is empty" }],
  ])("refuses %s on main", (_, reported) => {
    const run = weighing({
      ".size-limit.json": [IOS],
      "main/.size-limit.json": reported,
    });

    expect(() => measuring(run)("origin/main", "HEAD", "main")).toThrow(
      "size-limit weighed no bundle by main/.size-limit.json",
    );
  });

  it("refuses a glob matching nothing on this change, as on main", () => {
    const run = weighing({
      ".size-limit.json": [IOS, { ...IOS, name: "app for Android", size: 0 }],
      "main/.size-limit.json": [IOS],
    });

    expect(() => measuring(run)("origin/main", "HEAD", "main")).toThrow(
      "size-limit weighed no bundle by .size-limit.json",
    );
  });

  it("refuses two sides that weighed different bundles, so each is held to its own figure on main", () => {
    const run = weighing({
      ".size-limit.json": [IOS, { ...IOS, name: "app for Android" }],
      "main/.size-limit.json": [IOS],
    });

    expect(() => measuring(run)("origin/main", "HEAD", "main")).toThrow(
      "size-limit weighed different bundles on main and on this change: app for iOS against app for iOS, app for Android",
    );
  });

  it("refuses as many bundles on each side under different names", () => {
    const run = weighing({
      ".size-limit.json": [IOS, { ...IOS, name: "app for Android" }],
      "main/.size-limit.json": [IOS, { ...IOS, name: "app for the web" }],
    });

    expect(() => measuring(run)("origin/main", "HEAD", "main")).toThrow(
      "size-limit weighed different bundles on main and on this change",
    );
  });

  it("refuses a bundle main weighed that this change did not", () => {
    const run = weighing({
      ".size-limit.json": [IOS],
      "main/.size-limit.json": [IOS, { ...IOS, name: "app for Android" }],
    });

    expect(() => measuring(run)("origin/main", "HEAD", "main")).toThrow(
      "size-limit weighed different bundles on main and on this change: app for iOS, app for Android against app for iOS",
    );
  });
});

describe("the ratchets the tree is held to", () => {
  it("reads both numbers out of the one file that holds them", () => {
    const { ratchets } = measuring(recorder().run, {
      [RATCHET]: JSON.stringify({ comments: 7, tests: 486 }),
    })("origin/main", "HEAD", "main");

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
