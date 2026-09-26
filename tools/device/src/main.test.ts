import { describe, expect, it } from "vitest";
import { held, heldWith, ran } from "./main.fixtures.ts";

describe("what the emulator measured, held to the merge base", () => {
  it("passes a branch no worse than the merge base's worst iteration on a steady runner, saying what it measured", () => {
    const report = held();

    expect(report.code).toBe(0);
    expect(report.err).toBe("");
    expect(report.out).toBe(
      [
        "### On the Android emulator",
        "",
        "Flashlight on one emulator, the merge base first, each over 3 iterations of start-up and 3 of the walk, with the app's data cleared before each. This branch's median over its iterations stands beside the merge base's worst; the spread is the standard deviation across iterations as a share of the mean.",
        "",
        "| Measure | This branch, median | Spread | Merge base, worst | Spread |",
        "| --- | --- | --- | --- | --- |",
        "| Start-up, launch to the first frame | 1010 ms | 0.8% | 1030 ms | 1.2% |",
        "| Walk, as Maestro makes it | 20200 ms | 0.8% | 20500 ms | 0.8% |",
        "| Frame rate over the walk | 60 FPS | 0% | 60 FPS | 0% |",
        "| CPU over the walk | 50% | 0% | 50% | 0% |",
        "| Memory over the walk | 201 MB | 0.4% | 203 MB | 0.6% |",
        "",
        "No figure is worse than the merge base's worst iteration, and the widest spread is 1.2%, under the 5 per cent Reassure calls steady.",
        "",
      ].join("\n"),
    );
  });

  it("fails a branch whose median is slower than the merge base's slowest iteration, naming the figure", () => {
    const report = heldWith("--head-startup", "slower-startup.json");

    expect(report.code).toBe(1);
    expect(report.out).toContain(
      "| Start-up, launch to the first frame | 1110 ms | 0.7% | 1030 ms | 1.2% |",
    );
    expect(report.out).toContain(
      "Worse than the merge base's worst iteration: Start-up, launch to the first frame.",
    );
  });

  it("holds a frame rate the other way, failing one below the merge base's lowest", () => {
    const report = heldWith("--head-journey", "fewer-frames.json");

    expect(report.code).toBe(1);
    expect(report.out).toContain(
      "Worse than the merge base's worst iteration: Frame rate over the walk.",
    );
  });

  it("asks for the reading again with more iterations when either side spread over 5 per cent", () => {
    const report = heldWith("--base-startup", "unsteady-startup.json");

    expect(report.code).toBe(3);
    expect(report.out).toContain(
      "The widest spread is 40.8%, over the 5 per cent Reassure calls steady, so the reading is taken again with twice the iterations.",
    );
  });

  it("counts a spread of exactly 5 per cent as unsteady, since Reassure calls steady only what is below it", () => {
    expect(heldWith("--base-startup", "edge-startup.json").code).toBe(3);
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
      "Worse than the merge base's worst iteration: Start-up, launch to the first frame, Frame rate over the walk.",
    );
  });

  it("fails as unmeasurable, never passes, when the second reading is still unsteady", () => {
    const report = ran(
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

    expect(report.code).toBe(1);
    expect(report.out).toContain(
      "Could not measure: the widest spread is still 40.8% with twice the iterations, over the 5 per cent Reassure calls steady.",
    );
  });

  it("reports the branch alone when the merge base has no walk to measure", () => {
    const report = ran(
      "--head-startup",
      "unsteady-startup.json",
      "--head-journey",
      "head-walk.json",
      "--no-baseline",
    );

    expect(report.code).toBe(0);
    expect(report.out).toContain(
      "| Measure | This branch, median | Spread |\n| --- | --- | --- |\n",
    );
    expect(report.out).toContain(
      "| Start-up, launch to the first frame | 1000 ms | 40.8% |",
    );
    expect(report.out).toContain(
      "The merge base has no walk to measure, so nothing here is held to one.",
    );
  });

  it("takes the middle iteration rather than the mean, so one slow iteration cannot move it", () => {
    expect(heldWith("--head-startup", "skewed-startup.json").out).toContain(
      "| Start-up, launch to the first frame | 1010 ms | 1.7% | 1030 ms | 1.2% |",
    );
  });

  it("takes the mean of the two middle iterations when there is an even number", () => {
    expect(heldWith("--head-startup", "startup.json").out).toContain(
      "| Start-up, launch to the first frame | 1000 ms | 10% |",
    );
  });

  it("leaves out an iteration Flashlight marked failed", () => {
    expect(heldWith("--head-startup", "startup-retried.json").out).toContain(
      "| Start-up, launch to the first frame | 1000 ms | 10% |",
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

  it.each(["--head-startup", "--base-startup", "--base-journey"])(
    "refuses a reading it cannot read wherever it was given, here %s",
    (flag) => {
      expect(heldWith(flag, "no-iteration.json").err).toBe(
        "no-iteration.json measured no iteration\n",
      );
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
        "usage: device --head-startup <flashlight.json> --head-journey <flashlight.json> (--base-startup <flashlight.json> --base-journey <flashlight.json> | --no-baseline) [--last]\n",
      );
    },
  );
});
