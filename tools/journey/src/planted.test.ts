import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const ENTRY = "tools/journey/src/index.ts";
const PLANTED = "tools/journey/planted";

const ratchet = (...argv: string[]) =>
  spawnSync(process.execPath, [ENTRY, ...argv], { encoding: "utf8" });

const held = (head: string, gesture = "gesture-steady.json") =>
  ratchet(
    "--head",
    `${PLANTED}/${head}`,
    "--head-gesture",
    `${PLANTED}/${gesture}`,
    "--base",
    `${PLANTED}/base.json`,
    "--base-gesture",
    `${PLANTED}/gesture-base.json`,
  );

describe("the planted red", () => {
  it("refuses a head whose journeys are slower than every one the base made", () => {
    const run = held("head-slower.json");

    expect(run.status).toBe(1);
    expect(run.stderr).toContain("slower");
  });

  it("refuses a head whose p75 LCP is over the threshold Google publishes as good", () => {
    const run = held("head-over-vitals.json");

    expect(run.status).toBe(1);
    expect(run.stderr).toContain(
      "LCP over the threshold Google publishes as good",
    );
  });

  it("refuses a head whose long tasks blocked longer than every journey the base made", () => {
    const run = held("head-more-blocking.json");

    expect(run.status).toBe(1);
    expect(run.stderr).toContain("more blocking than every blocking");
  });

  it("refuses a head whose gestures dropped more frames than every gesture the base made", () => {
    const run = held("head-faster.json", "gesture-dropping.json");

    expect(run.status).toBe(1);
    expect(run.stderr).toContain("more dropped frames than every gesture");
  });

  it("refuses a head that measured no journey", () => {
    expect(
      ratchet(
        "--head",
        `${PLANTED}/head-empty.json`,
        "--head-gesture",
        `${PLANTED}/gesture-steady.json`,
        "--no-baseline",
      ).status,
    ).toBe(1);
  });

  it("refuses a base file that was never written", () => {
    expect(
      ratchet(
        "--head",
        `${PLANTED}/head-faster.json`,
        "--head-gesture",
        `${PLANTED}/gesture-steady.json`,
        "--base",
        `${PLANTED}/never-written.json`,
      ).status,
    ).toBe(1);
  });

  it("accepts a head no slower and no busier than the base and inside every threshold, so it is not refusing everything", () => {
    const run = held("head-faster.json");

    expect(run.status).toBe(0);
    expect(run.stdout).toContain("ms");
    expect(run.stdout).toContain("KiB");
    expect(run.stdout).toContain("frame(s)");
  });
});
