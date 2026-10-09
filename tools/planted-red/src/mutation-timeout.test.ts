import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const READ_RUNNERS =
  'import("./stryker.config.mjs").then(({ default: config }) => console.log(JSON.stringify({ coverageAnalysis: config.coverageAnalysis ?? null, timeoutFactor: config.timeoutFactor ?? null, timeoutMS: config.timeoutMS ?? null, concurrency: config.concurrency ?? null })))';

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
    expect(JSON.parse(shell.said)).toStrictEqual({
      coverageAnalysis: "perTest",
      timeoutFactor: 3,
      timeoutMS: 100_000,
      concurrency: 2,
    });
  });

  it("leaves a Vitest shard, which runs each test once, at Stryker's own defaults", () => {
    const core = runnersOf("core");

    expect(core.status).toBe(0);
    expect(JSON.parse(core.said)).toStrictEqual({
      coverageAnalysis: null,
      timeoutFactor: null,
      timeoutMS: null,
      concurrency: null,
    });
  });
});
