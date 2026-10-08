import { describe, expect, it } from "vitest";
import { BIOME, OXLINT } from "./limits.js";
import { GLOBS, lines, measuring, recorder } from "./measure.fixtures.js";
import { RATCHET } from "./measure.js";
import type { Run } from "./shell.js";

const measured = (over: Record<string, string>) => () =>
  measuring(recorder().run, over)("origin/main", "HEAD", "main", true);

describe("what size-limit reported", () => {
  const weighing = (
    byConfig: Record<string, unknown>,
    mainGlobs = GLOBS,
  ): Run =>
    recorder((command) => {
      if (command.command === "git" && command.args[0] === "-C")
        return { ok: true, stdout: mainGlobs, stderr: "" };
      if (command.command !== "pnpm" || command.args[1] !== "size-limit")
        return undefined;
      const config = command.args[command.args.indexOf("--config") + 1] ?? "";
      return {
        ok: false,
        stdout: JSON.stringify(byConfig[config]),
        stderr: "",
      };
    }).run;

  const weighedBy = (run: Run, mainExported = true) =>
    measuring(run)("origin/main", "HEAD", "main", mainExported).bundles;

  const IOS = { name: "app for iOS", size: 15 };

  it("weighs main by the configuration in its tree and this change by its own, whatever size-limit exits", () => {
    const run = weighing({
      ".size-limit.json": [{ ...IOS, size: 90 }],
      "main/.size-limit.json": [IOS],
    });

    expect(weighedBy(run)).toStrictEqual({
      kind: "weighed",
      bundles: [{ name: "app for iOS", main: 15, change: 90 }],
      globsChanged: false,
    });
  });

  it("reads main's globs from main's own commit, since the job weighs main by this change's", () => {
    const { run, commands } = recorder();

    measuring(run)("origin/main", "HEAD", "main", true);

    expect(lines(commands)).toContain("git -C main show HEAD:.size-limit.json");
  });

  it("says the globs changed when main's committed configuration differs from this change's", () => {
    const run = weighing(
      { ".size-limit.json": [IOS], "main/.size-limit.json": [IOS] },
      JSON.stringify([{ name: "app for iOS", path: "dist/**/*.js" }]),
    );

    expect(weighedBy(run)).toMatchObject({ globsChanged: true });
  });

  it("does not count a removed limit as a glob change, since a limit decides nothing about what is weighed", () => {
    const run = weighing(
      { ".size-limit.json": [IOS], "main/.size-limit.json": [IOS] },
      JSON.stringify([
        { name: "app for iOS", path: "dist/ios/*.js", limit: "534414 B" },
      ]),
    );

    expect(weighedBy(run)).toMatchObject({ globsChanged: false });
  });

  it.each([
    ["a path", { name: "app for iOS", path: "dist/**/*.js" }],
    ["a name", { name: "the iOS app", path: "dist/ios/*.js" }],
    [
      "a compression",
      { name: "app for iOS", path: "dist/ios/*.js", gzip: true },
    ],
    [
      "an ignore list",
      { name: "app for iOS", path: "dist/ios/*.js", ignore: ["x"] },
    ],
  ])("counts a changed %s as a glob change", (_, entry) => {
    const run = weighing(
      { ".size-limit.json": [IOS], "main/.size-limit.json": [IOS] },
      JSON.stringify([entry]),
    );

    expect(weighedBy(run)).toMatchObject({ globsChanged: true });
  });

  it("takes a bundle that weighs 0 B on main as one main does not ship yet", () => {
    const run = weighing({
      ".size-limit.json": [IOS],
      "main/.size-limit.json": [{ ...IOS, size: 0 }],
    });

    expect(weighedBy(run)).toMatchObject({
      bundles: [{ name: "app for iOS", main: 0, change: 15 }],
    });
  });

  it.each([
    ["a bundle with no size", [{ name: "app for iOS" }]],
    ["a bundle with no name", [{ size: 15 }]],
    [
      "one good bundle beside one with no size",
      [IOS, { name: "app for Android" }],
    ],
    ["no bundle at all", []],
    ["size-limit's error object", { error: "SizeLimitError: config is empty" }],
  ])("does not weigh over %s on main, and says so", (_, reported) => {
    const run = weighing({
      ".size-limit.json": [IOS],
      "main/.size-limit.json": reported,
    });

    expect(weighedBy(run)).toStrictEqual({
      kind: "unweighed",
      reason: `size-limit weighed nothing by main/.size-limit.json on main: ${JSON.stringify(reported)}`,
    });
  });

  it("does not weigh over a glob that matched no file on this change, and names it", () => {
    const run = weighing({
      ".size-limit.json": [IOS, { ...IOS, name: "app for Android", size: 0 }],
      "main/.size-limit.json": [IOS, { ...IOS, name: "app for Android" }],
    });

    expect(weighedBy(run)).toStrictEqual({
      kind: "unweighed",
      reason:
        "app for Android weighed 0 B on this change, so its glob matched no file",
    });
  });

  it("names every bundle that matched no file on this change", () => {
    const run = weighing({
      ".size-limit.json": [
        { ...IOS, size: 0 },
        { ...IOS, name: "app for Android", size: 0 },
      ],
      "main/.size-limit.json": [IOS, { ...IOS, name: "app for Android" }],
    });

    expect(weighedBy(run)).toMatchObject({
      reason:
        "app for iOS, app for Android weighed 0 B on this change, so its glob matched no file",
    });
  });

  it("does not weigh over this change's own unreadable output either", () => {
    const run = weighing({
      ".size-limit.json": [],
      "main/.size-limit.json": [IOS],
    });

    expect(weighedBy(run)).toMatchObject({ kind: "unweighed" });
  });

  it("does not weigh at all when main could not be exported", () => {
    const { run, commands } = recorder();

    expect(
      measuring(run)("origin/main", "HEAD", "main", false).bundles,
    ).toStrictEqual({
      kind: "unweighed",
      reason:
        "main could not be checked out and exported, and the step that tried says why",
    });
    expect(lines(commands).some((line) => line.includes("size-limit"))).toBe(
      false,
    );
  });

  it.each([
    [
      "this change weighed a bundle main did not",
      [IOS, { ...IOS, name: "app for Android" }],
      [IOS],
      "size-limit weighed app for iOS on main against app for iOS, app for Android on this change",
    ],
    [
      "main weighed a bundle this change did not",
      [IOS],
      [IOS, { ...IOS, name: "app for Android" }],
      "size-limit weighed app for iOS, app for Android on main against app for iOS on this change",
    ],
    [
      "as many bundles on each side carry different names",
      [IOS, { ...IOS, name: "app for Android" }],
      [IOS, { ...IOS, name: "app for the web" }],
      "size-limit weighed app for iOS, app for the web on main against app for iOS, app for Android on this change",
    ],
  ])("does not compare two sides when %s", (_, change, main, reason) => {
    const run = weighing({
      ".size-limit.json": change,
      "main/.size-limit.json": main,
    });

    expect(weighedBy(run)).toStrictEqual({ kind: "unweighed", reason });
  });
});

describe("the ratchets the tree is held to", () => {
  it("reads both numbers out of the one file that holds them", () => {
    const { ratchets } = measuring(recorder().run, {
      [RATCHET]: JSON.stringify({ comments: 7, tests: 486 }),
    })("origin/main", "HEAD", "main", true);

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
