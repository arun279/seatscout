import { describe, expect, it } from "vitest";
import { held, heldWith, ran } from "./main.fixtures.ts";

const START = "Start-up, a cold launch to the first frame";

describe("what the emulator measured, each measure held to the merge base while it is steady", () => {
  it("passes a branch no worse than the merge base's worst on a steady runner, saying what it measured", () => {
    const report = held();

    expect(report.code).toBe(0);
    expect(report.err).toBe("");
    expect(report.out).toBe(
      [
        "### On the Android emulator",
        "",
        "One emulator, the merge base first. Start-up is the platform's own cold-launch timing, `am start -W` TotalTime, over 3 cold launches; the walk is Flashlight over 3 iterations with the app's data cleared before each. This branch's median stands beside the merge base's worst; the spread is the standard deviation as a share of the mean, and a measure is held only while it stays under the 5 per cent Reassure calls steady.",
        "",
        "| Measure | This branch, median | Spread | Merge base, worst | Spread |",
        "| --- | --- | --- | --- | --- |",
        `| ${START} | 1010 ms | 0.8% | 1030 ms | 1.2% |`,
        "| Walk, as Maestro makes it | 20200 ms | 0.8% | 20500 ms | 0.8% |",
        "| Frame rate over the walk | 60 FPS | 0% | 60 FPS | 0% |",
        "| CPU over the walk | 50% | 0% | 50% | 0% |",
        "| Memory over the walk | 201 MB | 0.4% | 203 MB | 0.6% |",
        "",
        "No figure held here is worse than the merge base's worst iteration.",
        "",
      ].join("\n"),
    );
  });

  it("fails a branch whose median start-up is slower than the merge base's slowest cold launch", () => {
    const report = heldWith("--head-startup", "slower-startup.json");

    expect(report.code).toBe(1);
    expect(report.out).toContain(
      `| ${START} | 1110 ms | 0.7% | 1030 ms | 1.2% |`,
    );
    expect(report.out).toContain(
      `Worse than the merge base's worst iteration: ${START}.`,
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
    const report = ran(
      "--head-startup",
      "slower-startup.json",
      "--head-journey",
      "fewer-frames.json",
      "--base-startup",
      "base-startup.json",
      "--base-journey",
      "base-walk.json",
    );

    expect(report.out).toContain(
      `Worse than the merge base's worst iteration: ${START}, Frame rate over the walk.`,
    );
  });

  it("reads everything again with twice the iterations when one measure spreads over 5 per cent on either side, naming it", () => {
    const report = heldWith("--base-startup", "unsteady-startup.json");

    expect(report.code).toBe(3);
    expect(report.out).toContain(
      `At or over the 5 per cent Reassure calls steady: ${START} (40.8%), so the reading is taken again with twice the iterations.`,
    );
  });

  it("counts a spread of exactly 5 per cent as unsteady, since Reassure calls steady only what is below it", () => {
    expect(heldWith("--base-startup", "edge-startup.json").code).toBe(3);
  });

  it("leaves out a measure still unsteady on the second reading, and holds the rest, never failing as unmeasurable", () => {
    const steady = ran(
      "--head-startup",
      "unsteady-startup.json",
      "--head-journey",
      "head-walk.json",
      "--base-startup",
      "base-startup.json",
      "--base-journey",
      "base-walk.json",
      "--last",
    );

    expect(steady.code).toBe(0);
    expect(steady.out).not.toContain(`| ${START} |`);
    expect(steady.out).toContain(
      `Left out, too unsteady to hold: ${START} (40.8%).`,
    );
    expect(steady.out).toContain("| Walk, as Maestro makes it | 20200 ms |");
  });

  it("still fails a steady measure that got worse when another is left out", () => {
    const report = ran(
      "--head-startup",
      "unsteady-startup.json",
      "--head-journey",
      "fewer-frames.json",
      "--base-startup",
      "base-startup.json",
      "--base-journey",
      "base-walk.json",
      "--last",
    );

    expect(report.code).toBe(1);
    expect(report.out).toContain(
      "Worse than the merge base's worst iteration: Frame rate over the walk.",
    );
  });

  it("names every measure it leaves out, and draws no table when nothing is left to hold", () => {
    const report = ran(
      "--head-startup",
      "unsteady-startup.json",
      "--head-journey",
      "all-unsteady-walk.json",
      "--no-baseline",
    );

    expect(report.out).not.toContain("| Measure |");
    expect(report.out).toContain(
      "the 5 per cent Reassure calls steady.\n\nLeft out, too unsteady to hold:",
    );
    expect(report.out).toContain(
      `Left out, too unsteady to hold: ${START} (40.8%), Walk, as Maestro makes it (40.8%), Frame rate over the walk (40.8%), CPU over the walk (40.8%), Memory over the walk (40.8%).\n\nThe merge base has no walk`,
    );
  });

  it("leaves out an unsteady walk time the same way", () => {
    const report = ran(
      "--head-startup",
      "head-startup.json",
      "--head-journey",
      "unsteady-walk.json",
      "--base-startup",
      "base-startup.json",
      "--base-journey",
      "base-walk.json",
      "--last",
    );

    expect(report.code).toBe(0);
    expect(report.out).toContain(
      "Left out, too unsteady to hold: Walk, as Maestro makes it (40.8%).",
    );
  });

  it("reports the branch alone when the merge base has no walk, leaving out what is unsteady", () => {
    const report = ran(
      "--head-startup",
      "unsteady-startup.json",
      "--head-journey",
      "head-walk.json",
      "--no-baseline",
    );

    expect(report.code).toBe(0);
    expect(report.out).toContain(
      "| Measure | This branch, median | Spread |\n| --- | --- | --- |\n| Walk, as Maestro makes it | 20200 ms | 0.8% |\n",
    );
    expect(report.out).toContain(
      `Left out, too unsteady to hold: ${START} (40.8%).`,
    );
    expect(report.out).toContain(
      "The merge base has no walk to measure, so nothing here is held to one.",
    );
  });

  it("takes the middle launch rather than the mean, so one slow launch cannot move it", () => {
    expect(heldWith("--head-startup", "skewed-startup.json").out).toContain(
      `| ${START} | 1010 ms | 1.7% | 1030 ms | 1.2% |`,
    );
  });

  it("takes the mean of the two middle launches when there is an even number", () => {
    expect(heldWith("--head-startup", "even-startup.json").out).toContain(
      `| ${START} | 1000 ms | 1% | 1030 ms | 1.2% |`,
    );
  });

  it("leaves out an iteration Flashlight marked failed", () => {
    expect(heldWith("--head-journey", "walk-retried.json").out).toContain(
      "| Walk, as Maestro makes it | 20200 ms | 1% |",
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

  it.each([
    ["missing.json", "missing.json was never written"],
    ["not-json.json", "not-json.json holds no JSON"],
    ["no-launch.json", "no-launch.json holds no cold launch it timed"],
    ["zero-launch.json", "zero-launch.json holds no cold launch it timed"],
    ["word-launch.json", "word-launch.json holds no cold launch it timed"],
    [
      "zero-among-launches.json",
      "zero-among-launches.json holds no cold launch it timed",
    ],
    [
      "text-number-launch.json",
      "text-number-launch.json holds no cold launch it timed",
    ],
    ["head-walk.json", "head-walk.json holds no cold launch it timed"],
  ])(
    "refuses cold launches in %s rather than report over them",
    (startup, refusal) => {
      const report = heldWith("--head-startup", startup);

      expect(report.code).toBe(1);
      expect(report.out).toBe("");
      expect(report.err).toBe(`${refusal}\n`);
    },
  );

  it.each([
    [
      "--base-startup",
      "no-launch.json",
      "no-launch.json holds no cold launch it timed",
    ],
    [
      "--base-journey",
      "no-iteration.json",
      "no-iteration.json measured no iteration",
    ],
  ])(
    "refuses the merge base's reading as it refuses this branch's, here %s",
    (flag, file, refusal) => {
      expect(heldWith(flag, file).err).toBe(`${refusal}\n`);
    },
  );

  it.each([
    [["--head-startup", "a", "--head-journey", "b"]],
    [["--head-startup", "a", "--no-baseline"]],
    [["--head-journey", "b", "--no-baseline"]],
    [["--head-startup", "a", "--head-journey", "b", "--base-startup", "c"]],
    [
      [
        "--head-startup",
        "a",
        "--head-journey",
        "b",
        "--base-startup",
        "c",
        "--base-journey",
        "d",
        "--no-baseline",
      ],
    ],
    [[]],
  ])(
    "asks for each reading and a word about the merge base when given %j",
    (argv) => {
      const report = ran(...argv);

      expect(report.code).toBe(2);
      expect(report.err).toBe(
        "usage: device --head-startup <launches.json> --head-journey <flashlight.json> (--base-startup <launches.json> --base-journey <flashlight.json> | --no-baseline) [--last]\n",
      );
    },
  );
});
