import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const READ_RUNNERS =
  'import("./stryker.config.mjs").then(({ default: config }) => console.log(JSON.stringify({ timeoutFactor: config.timeoutFactor ?? null, concurrency: config.concurrency ?? null })))';

const runnersOf = (shard: string) => {
  const run = spawnSync("node", ["--eval", READ_RUNNERS], {
    encoding: "utf8",
    env: { ...process.env, MUTATION_SHARD: shard },
  });
  return { status: run.status, said: run.stdout, refused: run.stderr };
};

describe("how Stryker runs a shard's mutants", () => {
  it("runs two Jest mutants at a time, each allowed Stryker's 1.5 for every platform its tests run under", () => {
    const shell = runnersOf("native-shell");

    expect(shell.refused).toBe("");
    expect(shell.status).toBe(0);
    expect(JSON.parse(shell.said)).toStrictEqual({
      timeoutFactor: 3,
      concurrency: 2,
    });
  });

  it("leaves a Vitest shard, which runs each test once, at Stryker's own defaults", () => {
    const core = runnersOf("core");

    expect(core.status).toBe(0);
    expect(JSON.parse(core.said)).toStrictEqual({
      timeoutFactor: null,
      concurrency: null,
    });
  });
});
