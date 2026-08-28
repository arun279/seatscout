import { describe, expect, it } from "vitest";
import { type RetryPolicy, delayAfter } from "./backoff.js";

const over = (failures: readonly number[], random: () => number) => {
  const policy: RetryPolicy = { attempts: 4, firstDelayMs: 500 };
  return failures.map((failed) => delayAfter(failed, policy, random));
};

describe("the retry delay", () => {
  it("doubles the window it draws from after each failed attempt", () => {
    expect(over([1, 2, 3], () => 1)).toEqual([500, 1000, 2000]);
    expect(over([1, 2, 3], () => 0.5)).toEqual([250, 500, 1000]);
  });

  it("keeps no floor under the delay, which is what full jitter means", () => {
    expect(over([1, 2, 3], () => 0)).toEqual([0, 0, 0]);
  });
});
