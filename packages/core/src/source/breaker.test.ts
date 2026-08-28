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
  };
};

describe("the circuit breaker", () => {
  it("opens on the failure that reaches the threshold and not before", () => {
    const { breaker } = rig();
    const seen: boolean[] = [];

    for (let failure = 0; failure < 3; failure += 1) {
      breaker.failed();
      seen.push(breaker.isOpen());
    }
    expect(seen).toEqual([false, false, true]);
  });

  it("counts consecutive failures only, so a success in between resets it", () => {
    const { breaker } = rig();

    breaker.failed();
    breaker.failed();
    breaker.succeeded();
    breaker.failed();
    breaker.failed();

    expect(breaker.isOpen()).toBe(false);
  });

  it("stays open for the whole break and lets a trial through the moment it ends", () => {
    const { breaker, at } = rig();

    for (let failure = 0; failure < 3; failure += 1) breaker.failed();
    at(4999);
    expect(breaker.isOpen()).toBe(true);
    at(5000);
    expect(breaker.isOpen()).toBe(false);
  });

  it("opens for another break when the trial fails", () => {
    const { breaker, at } = rig();

    for (let failure = 0; failure < 3; failure += 1) breaker.failed();
    at(5000);
    breaker.failed();
    at(9999);
    expect(breaker.isOpen()).toBe(true);
    at(10000);
    expect(breaker.isOpen()).toBe(false);
  });

  it("closes when the trial succeeds, so the next failure starts a fresh count", () => {
    const { breaker, at } = rig();

    for (let failure = 0; failure < 3; failure += 1) breaker.failed();
    at(5000);
    breaker.succeeded();
    breaker.failed();

    expect(breaker.isOpen()).toBe(false);
  });
});
