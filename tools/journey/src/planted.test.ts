import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const ENTRY = "tools/journey/src/index.ts";
const PLANTED = "tools/journey/planted";

const ratchet = (...argv: string[]) =>
  spawnSync(process.execPath, [ENTRY, ...argv], { encoding: "utf8" });

describe("the planted red", () => {
  it("refuses a head whose journeys are slower than every one the base made", () => {
    const run = ratchet(
      "--head",
      `${PLANTED}/head-slower.json`,
      "--base",
      `${PLANTED}/base.json`,
    );

    expect(run.status).toBe(1);
    expect(run.stderr).toContain("slower");
  });

  it("refuses a head that measured no journey", () => {
    expect(
      ratchet("--head", `${PLANTED}/head-empty.json`, "--no-baseline").status,
    ).toBe(1);
  });

  it("refuses a base file that was never written", () => {
    expect(
      ratchet(
        "--head",
        `${PLANTED}/head-faster.json`,
        "--base",
        `${PLANTED}/never-written.json`,
      ).status,
    ).toBe(1);
  });

  it("accepts a head no slower than the base, so it is not refusing everything", () => {
    const run = ratchet(
      "--head",
      `${PLANTED}/head-faster.json`,
      "--base",
      `${PLANTED}/base.json`,
    );

    expect(run.status).toBe(0);
    expect(run.stdout).toContain("ms");
  });
});
