import { describe, expect, it } from "vitest";
import { circuitBreaker } from "./breaker.js";

const rig = () => {
  let clock = 0;
  const breaker = circuitBreaker(
    { failuresBeforeOpening: 3, openForMs: 5000 },
    () => clock,
  );
  return {
    breaker,
    at: (moment: number) => {
      clock = moment;
    },
    failTimes: (times: number) => {
      for (let failure = 0; failure < times; failure += 1) breaker.failed();
    },
  };
};

describe("the circuit breaker", () => {
  it("opens on the failure that reaches the threshold and not before", () => {
    const { breaker } = rig();
    const seen: boolean[] = [];

    for (let failure = 0; failure < 3; failure += 1) {
      breaker.failed();
      seen.push(breaker.refuses());
    }
    expect(seen).toEqual([false, false, true]);
  });

  it("admits every request while it is closed", () => {
    const { breaker, at } = rig();

    at(9000);
    expect([breaker.refuses(), breaker.refuses()]).toEqual([false, false]);
  });

  it("counts consecutive failures only, so a success in between resets it", () => {
    const { breaker, failTimes } = rig();

    failTimes(2);
    breaker.succeeded();
    failTimes(2);

    expect(breaker.refuses()).toBe(false);
  });

  it("stays open for the whole break and admits one trial when it ends", () => {
    const { breaker, at, failTimes } = rig();

    failTimes(3);
    at(4999);
    expect(breaker.refuses()).toBe(true);
    at(5000);
    expect(breaker.refuses()).toBe(false);
    expect(breaker.refuses()).toBe(true);
  });

  it("opens for another break when the trial fails", () => {
    const { breaker, at, failTimes } = rig();

    failTimes(3);
    at(5000);
    breaker.failed();
    at(9999);
    expect(breaker.refuses()).toBe(true);
    at(10000);
    expect(breaker.refuses()).toBe(false);
  });

  it("closes at once on a success, because an answer is evidence the break is over", () => {
    const { breaker, at, failTimes } = rig();

    failTimes(3);
    at(3000);
    breaker.succeeded();

    expect(breaker.refuses()).toBe(false);
    breaker.failed();
    expect(breaker.refuses()).toBe(false);
  });
});
