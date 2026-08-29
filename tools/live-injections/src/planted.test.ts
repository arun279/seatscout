import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const ENTRY = "tools/live-injections/src/index.ts";
const PLANTED = "tools/live-injections/planted";

const gate = (...args: readonly string[]) =>
  spawnSync(process.execPath, [ENTRY, ...args], { encoding: "utf8" });

describe("the planted red", () => {
  it("refuses the planted test that injects what the planted setup does not provide", () => {
    const run = gate(`${PLANTED}/provides.txt`, `${PLANTED}/*.live.txt`);

    expect(run.status).toBe(1);
    expect(run.stderr).toBe(
      `${PLANTED}/provides.txt provides liveArea, and the live suite asks for more:\n` +
        `  ${PLANTED}/asks-for-more.live.txt injects liveShowtime\n`,
    );
  });

  it("accepts the planted test that asks for what is there, so it is not refusing everything", () => {
    const run = gate(
      `${PLANTED}/provides.txt`,
      `${PLANTED}/asks-for-what-is-there.live.txt`,
    );

    expect(run.status).toBe(0);
    expect(run.stdout).toContain("provides every value the live suite injects");
  });

  it("refuses a setup that provides nothing", () => {
    const run = gate(
      `${PLANTED}/provides-nothing.txt`,
      `${PLANTED}/*.live.txt`,
    );

    expect(run.status).toBe(1);
  });

  it("refuses a pattern that matches no live test", () => {
    const run = gate(`${PLANTED}/provides.txt`, `${PLANTED}/*.nothing`);

    expect(run.status).toBe(1);
  });
});
