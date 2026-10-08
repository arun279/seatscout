import { describe, expect, it } from "vitest";
import { heldWith, ran } from "./main.fixtures.ts";

const WALK = "Walk, as Maestro makes it";

describe("what the emulator measured, each measure held to the previous run while it is steady", () => {
  it("passes a commit no worse than the previous run's worst on a steady runner, saying what it measured", () => {
    const report = ran(
      "--journey",
      "head-walk.json",
      "--previous",
      "base-walk.json",
    );

    expect(report.code).toBe(0);
    expect(report.err).toBe("");
    expect(report.out).toBe(
      [
        "### On the Android emulator",
        "",
        "One emulator, one build of main. The walk is Flashlight over 3 iterations with the app's data cleared before each. This commit's median stands beside the previous Baseline run's worst; the spread is the standard deviation as a share of the mean, and a measure is held only while it stays under the 5 per cent Reassure calls steady. Both sides are rounded before they are compared, to the places Flashlight's report gives its averages: ms to 0 decimals, FPS to 1 decimal, % to 1 decimal, MB to 1 decimal.",
        "",
        "| Measure | This commit, median | Spread | Previous run, worst | Spread |",
        "| --- | --- | --- | --- | --- |",
        `| ${WALK} | 20200 ms | 0.8% | 20500 ms | 0.8% |`,
        "| Frame rate over the walk | 60 FPS | 0% | 60 FPS | 0% |",
        "| CPU over the walk | 50% | 0% | 50% | 0% |",
        "| Memory over the walk | 201 MB | 0.4% | 203 MB | 0.6% |",
        "",
        "No figure held here is worse than the previous run's worst iteration.",
        "",
      ].join("\n"),
    );
  });

  it("fails a commit whose median walk is slower than the previous run's slowest iteration", () => {
    const report = heldWith("--journey", "slower-walk.json");

    expect(report.code).toBe(1);
    expect(report.out).toContain(
      `| ${WALK} | 21200 ms | 0.8% | 20500 ms | 0.8% |`,
    );
    expect(report.out).toContain(
      `Worse than the previous run's worst iteration: ${WALK}.`,
    );
  });

  it("holds a frame rate the other way, failing one below the previous run's lowest", () => {
    const report = heldWith("--journey", "fewer-frames.json");

    expect(report.code).toBe(1);
    expect(report.out).toContain(
      "Worse than the previous run's worst iteration: Frame rate over the walk.",
    );
  });

  it("holds each figure at the precision Flashlight reports it, so a frame rate and a walk that round to the previous worst are not worse", () => {
    const report = ran(
      "--journey",
      "within-precision.json",
      "--previous",
      "base-fractions.json",
    );

    expect(report.code).toBe(0);
    expect(report.out).toContain(
      `| ${WALK} | 20500 ms | 0% | 20500 ms | 0.8% |`,
    );
    expect(report.out).toContain(
      "| Frame rate over the walk | 59.9 FPS | 0% | 59.9 FPS | 0% |",
    );
  });

  it("fails a frame rate one tenth below the previous worst, the smallest step Flashlight reports", () => {
    const report = ran(
      "--journey",
      "one-tenth-fewer.json",
      "--previous",
      "base-fractions.json",
    );

    expect(report.code).toBe(1);
    expect(report.out).toContain(
      "| Frame rate over the walk | 59.8 FPS | 0% | 59.9 FPS | 0% |",
    );
  });

  it("names every figure that got worse", () => {
    expect(heldWith("--journey", "slower-fewer.json").out).toContain(
      `Worse than the previous run's worst iteration: ${WALK}, Frame rate over the walk.`,
    );
  });

  it("leaves out a measure that spreads 5 per cent or more on either side, names it, and holds the rest, never failing as unmeasurable", () => {
    const report = heldWith("--journey", "unsteady-walk.json");

    expect(report.code).toBe(0);
    expect(report.out).not.toContain(`| ${WALK} |`);
    expect(report.out).toContain(
      `Left out, too unsteady to hold: ${WALK} (40.8%).\n\nNo figure held here`,
    );
    expect(report.out).toContain(
      "| Frame rate over the walk | 60 FPS | 0% | 60 FPS | 0% |",
    );
  });

  it("counts a spread of exactly 5 per cent on the previous run as unsteady, since Reassure calls steady only what is below it", () => {
    const report = heldWith("--previous", "edge-walk.json");

    expect(report.code).toBe(0);
    expect(report.out).toContain(
      `Left out, too unsteady to hold: ${WALK} (5%).`,
    );
  });

  it("still fails a steady measure that got worse when another is left out", () => {
    const report = heldWith("--journey", "unsteady-fewer.json");

    expect(report.code).toBe(1);
    expect(report.out).toContain(
      "Worse than the previous run's worst iteration: Frame rate over the walk.",
    );
  });

  it("names every measure it leaves out, and draws no table when nothing is left to hold", () => {
    const report = ran("--journey", "all-unsteady-walk.json", "--no-previous");

    expect(report.out).not.toContain("| Measure |");
    expect(report.out).toContain(
      "MB to 1 decimal.\n\nLeft out, too unsteady to hold:",
    );
    expect(report.out).toContain(
      `Left out, too unsteady to hold: ${WALK} (40.8%), Frame rate over the walk (40.8%), CPU over the walk (40.8%), Memory over the walk (40.8%).\n\nNo earlier Baseline run left a reading`,
    );
  });

  it("reports the commit alone when no earlier run left a reading, leaving out what is unsteady", () => {
    const report = ran("--journey", "unsteady-walk.json", "--no-previous");

    expect(report.code).toBe(0);
    expect(report.out).toContain(
      "| Measure | This commit, median | Spread |\n| --- | --- | --- |\n| Frame rate over the walk | 60 FPS | 0% |\n",
    );
    expect(report.out).toContain(
      `Left out, too unsteady to hold: ${WALK} (40.8%).`,
    );
    expect(report.out).toContain(
      "No earlier Baseline run left a reading, so nothing here is held to one.",
    );
  });

  it("takes the middle iteration rather than the mean, so one slow iteration cannot move it", () => {
    expect(heldWith("--journey", "skewed-walk.json").out).toContain(
      `| ${WALK} | 20100 ms | 0.8% | 20500 ms | 0.8% |`,
    );
  });

  it("takes the mean of the two middle iterations when there is an even number", () => {
    expect(heldWith("--journey", "even-walk.json").out).toContain(
      `| ${WALK} | 20100 ms | 3.6% | 20500 ms | 0.8% |`,
    );
  });

  it("leaves out an iteration Flashlight marked failed", () => {
    expect(heldWith("--journey", "walk-retried.json").out).toContain(
      `| ${WALK} | 20200 ms | 1% |`,
    );
  });

  it.each([
    ["missing.json", "missing.json was never written"],
    ["not-json.json", "not-json.json holds no JSON"],
    ["not-a-run.json", "not-a-run.json holds no Flashlight run"],
    ["null.json", "null.json holds no Flashlight run"],
    ["a-number.json", "a-number.json holds no Flashlight run"],
    ["no-status.json", "no-status.json holds no Flashlight run"],
    ["no-list.json", "no-list.json holds no Flashlight run"],
    ["failed.json", "failed.json records a Flashlight run that failed"],
    ["no-iteration.json", "no-iteration.json measured no iteration"],
    ["no-measure.json", "no-measure.json measured no iteration"],
    ["one-unmeasured.json", "one-unmeasured.json measured no iteration"],
    ["no-frame.json", "no-frame.json read no frame rate or memory"],
    ["no-ram.json", "no-ram.json read no frame rate or memory"],
    ["no-fps.json", "no-fps.json read no frame rate or memory"],
    [
      "no-cpu.json",
      "no-cpu.json read a figure that was nothing on every iteration",
    ],
  ])("refuses %s rather than report over it", (journey, refusal) => {
    const report = heldWith("--journey", journey);

    expect(report.code).toBe(1);
    expect(report.out).toBe("");
    expect(report.err).toBe(`${refusal}\n`);
  });

  it("refuses the previous run's reading as it refuses this commit's", () => {
    const report = heldWith("--previous", "no-iteration.json");

    expect(report.code).toBe(1);
    expect(report.err).toBe("no-iteration.json measured no iteration\n");
  });

  it.each([
    [["--journey", "b"]],
    [["--no-previous"]],
    [["--previous", "d"]],
    [["--journey", "b", "--previous", "d", "--no-previous"]],
    [[]],
  ])(
    "asks for each reading and a word about the previous run when given %j",
    (argv) => {
      const report = ran(...argv);

      expect(report.code).toBe(2);
      expect(report.err).toBe(
        "usage: device --journey <flashlight.json> (--previous <flashlight.json> | --no-previous)\n",
      );
    },
  );
});
