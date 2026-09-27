import { describe, expect, it } from "vitest";
import { held, heldWith, ran } from "./main.fixtures.ts";

const WALK = "Walk, as Maestro makes it";

describe("what the emulator measured, each measure held to the merge base while it is steady", () => {
  it("passes a branch no worse than the merge base's worst on a steady runner, saying what it measured", () => {
    const report = held();

    expect(report.code).toBe(0);
    expect(report.err).toBe("");
    expect(report.out).toBe(
      [
        "### On the Android emulator",
        "",
        "One emulator, the merge base first. The walk is Flashlight over 3 iterations with the app's data cleared before each. This branch's median stands beside the merge base's worst; the spread is the standard deviation as a share of the mean, and a measure is held only while it stays under the 5 per cent Reassure calls steady.",
        "",
        "| Measure | This branch, median | Spread | Merge base, worst | Spread |",
        "| --- | --- | --- | --- | --- |",
        `| ${WALK} | 20200 ms | 0.8% | 20500 ms | 0.8% |`,
        "| Frame rate over the walk | 60 FPS | 0% | 60 FPS | 0% |",
        "| CPU over the walk | 50% | 0% | 50% | 0% |",
        "| Memory over the walk | 201 MB | 0.4% | 203 MB | 0.6% |",
        "",
        "No figure held here is worse than the merge base's worst iteration.",
        "",
      ].join("\n"),
    );
  });

  it("fails a branch whose median walk is slower than the merge base's slowest iteration", () => {
    const report = heldWith("--head-journey", "slower-walk.json");

    expect(report.code).toBe(1);
    expect(report.out).toContain(
      `| ${WALK} | 21200 ms | 0.8% | 20500 ms | 0.8% |`,
    );
    expect(report.out).toContain(
      `Worse than the merge base's worst iteration: ${WALK}.`,
    );
  });

  it("holds a frame rate the other way, failing one below the merge base's lowest", () => {
    const report = heldWith("--head-journey", "fewer-frames.json");

    expect(report.code).toBe(1);
    expect(report.out).toContain(
      "Worse than the merge base's worst iteration: Frame rate over the walk.",
    );
  });

  it("names every figure that got worse", () => {
    expect(heldWith("--head-journey", "slower-fewer.json").out).toContain(
      `Worse than the merge base's worst iteration: ${WALK}, Frame rate over the walk.`,
    );
  });

  it("leaves out a measure that spreads 5 per cent or more on either side, names it, and holds the rest, never failing as unmeasurable", () => {
    const report = heldWith("--head-journey", "unsteady-walk.json");

    expect(report.code).toBe(0);
    expect(report.out).not.toContain(`| ${WALK} |`);
    expect(report.out).toContain(
      `Left out, too unsteady to hold: ${WALK} (40.8%).\n\nNo figure held here`,
    );
    expect(report.out).toContain(
      "| Frame rate over the walk | 60 FPS | 0% | 60 FPS | 0% |",
    );
  });

  it("counts a spread of exactly 5 per cent on the merge base as unsteady, since Reassure calls steady only what is below it", () => {
    const report = heldWith("--base-journey", "edge-walk.json");

    expect(report.code).toBe(0);
    expect(report.out).toContain(
      `Left out, too unsteady to hold: ${WALK} (5%).`,
    );
  });

  it("still fails a steady measure that got worse when another is left out", () => {
    const report = heldWith("--head-journey", "unsteady-fewer.json");

    expect(report.code).toBe(1);
    expect(report.out).toContain(
      "Worse than the merge base's worst iteration: Frame rate over the walk.",
    );
  });

  it("names every measure it leaves out, and draws no table when nothing is left to hold", () => {
    const report = ran(
      "--head-journey",
      "all-unsteady-walk.json",
      "--no-baseline",
    );

    expect(report.out).not.toContain("| Measure |");
    expect(report.out).toContain(
      "the 5 per cent Reassure calls steady.\n\nLeft out, too unsteady to hold:",
    );
    expect(report.out).toContain(
      `Left out, too unsteady to hold: ${WALK} (40.8%), Frame rate over the walk (40.8%), CPU over the walk (40.8%), Memory over the walk (40.8%).\n\nThe merge base has no walk`,
    );
  });

  it("reports the branch alone when the merge base has no walk, leaving out what is unsteady", () => {
    const report = ran("--head-journey", "unsteady-walk.json", "--no-baseline");

    expect(report.code).toBe(0);
    expect(report.out).toContain(
      "| Measure | This branch, median | Spread |\n| --- | --- | --- |\n| Frame rate over the walk | 60 FPS | 0% |\n",
    );
    expect(report.out).toContain(
      `Left out, too unsteady to hold: ${WALK} (40.8%).`,
    );
    expect(report.out).toContain(
      "The merge base has no walk to measure, so nothing here is held to one.",
    );
  });

  it("takes the middle iteration rather than the mean, so one slow iteration cannot move it", () => {
    expect(heldWith("--head-journey", "skewed-walk.json").out).toContain(
      `| ${WALK} | 20100 ms | 0.8% | 20500 ms | 0.8% |`,
    );
  });

  it("takes the mean of the two middle iterations when there is an even number", () => {
    expect(heldWith("--head-journey", "even-walk.json").out).toContain(
      `| ${WALK} | 20100 ms | 3.6% | 20500 ms | 0.8% |`,
    );
  });

  it("leaves out an iteration Flashlight marked failed", () => {
    expect(heldWith("--head-journey", "walk-retried.json").out).toContain(
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
    const report = heldWith("--head-journey", journey);

    expect(report.code).toBe(1);
    expect(report.out).toBe("");
    expect(report.err).toBe(`${refusal}\n`);
  });

  it("refuses the merge base's reading as it refuses this branch's", () => {
    const report = heldWith("--base-journey", "no-iteration.json");

    expect(report.code).toBe(1);
    expect(report.err).toBe("no-iteration.json measured no iteration\n");
  });

  it.each([
    [["--head-journey", "b"]],
    [["--no-baseline"]],
    [["--base-journey", "d"]],
    [["--head-journey", "b", "--base-journey", "d", "--no-baseline"]],
    [[]],
  ])(
    "asks for each reading and a word about the merge base when given %j",
    (argv) => {
      const report = ran(...argv);

      expect(report.code).toBe(2);
      expect(report.err).toBe(
        "usage: device --head-journey <flashlight.json> (--base-journey <flashlight.json> | --no-baseline)\n",
      );
    },
  );
});
