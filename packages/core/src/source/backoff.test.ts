import { describe, expect, it } from "vitest";
import { delayAfter } from "./backoff.js";

const over = (failures: readonly number[], random: () => number) =>
  failures.map((failed) => delayAfter(failed, 500, random));

describe("the retry delay", () => {
  it("doubles the window it draws from after each failed attempt", () => {
    expect(over([1, 2, 3], () => 0.5)).toEqual([250, 500, 1000]);
    expect(over([1, 2, 3], () => 0.25)).toEqual([125, 250, 500]);
  });

  it("keeps no floor under the delay, which is what full jitter means", () => {
    expect(over([1, 2, 3], () => 0)).toEqual([0, 0, 0]);
  });
});
