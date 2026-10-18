import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const READ_RUNNERS =
  'import("./stryker.config.mjs").then(({ default: config }) => console.log(JSON.stringify({ coverageAnalysis: config.coverageAnalysis ?? null, timeoutFactor: config.timeoutFactor ?? null, timeoutMS: config.timeoutMS ?? null, concurrency: config.concurrency ?? null, ignorers: config.ignorers ?? null, break: config.thresholds?.break ?? null })))';

const runnersOf = (shard: string) => {
  const run = spawnSync("node", ["--eval", READ_RUNNERS], {
    encoding: "utf8",
    env: { ...process.env, MUTATION_SHARD: shard },
  });
  return { status: run.status, said: run.stdout, refused: run.stderr };
};

describe("how Stryker runs a shard's mutants", () => {
  it("gives a Jest shard per-test coverage, two runners, factor 3 and 100 s more allowance", () => {
    const shell = runnersOf("native-shell");

    expect(shell.refused).toBe("");
    expect(shell.status).toBe(0);
    expect(JSON.parse(shell.said)).toMatchObject({
      coverageAnalysis: "perTest",
      timeoutFactor: 3,
      timeoutMS: 100_000,
      concurrency: 2,
    });
  });

  it.each([
    ["native-theme", "off"],
    ["native-design-system", "perTest"],
    ["native-search", "perTest"],
    ["native-ask", "perTest"],
    ["native-shell", "perTest"],
  ])("gives %s %s coverage", (shard, coverage) => {
    const run = runnersOf(shard);

    expect(run.status).toBe(0);
    expect(JSON.parse(run.said)).toMatchObject({ coverageAnalysis: coverage });
  });

  it("leaves a Vitest shard, which runs each test once, at Stryker's own defaults", () => {
    const core = runnersOf("core");

    expect(core.status).toBe(0);
    expect(JSON.parse(core.said)).toMatchObject({
      coverageAnalysis: null,
      timeoutFactor: null,
      timeoutMS: null,
      concurrency: null,
    });
  });

  it.each(["core", "native-shell"])(
    "keeps a %s job to the places it names, and sets no score to break on, so only a broken run ends Stryker with a failure",
    (shard) => {
      const run = runnersOf(shard);

      expect(run.status).toBe(0);
      expect(JSON.parse(run.said)).toMatchObject({
        ignorers: ["drawn-values", "exact-ranges"],
        break: null,
      });
    },
  );
});
