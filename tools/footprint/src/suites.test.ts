import { describe, expect, it } from "vitest";
import { suites, suitesFrom } from "./suites.js";

const listed = (howMany: number): string =>
  JSON.stringify(
    Array.from({ length: howMany }, (_, index) => ({
      name: `test ${index}`,
      file: "packages/core/src/seat.test.ts",
    })),
  );

const NESTED = JSON.stringify({
  suites: [
    {
      specs: [{ tests: [{}] }],
      suites: [{ specs: [{ tests: [{}, {}] }] }],
    },
    { specs: [{ tests: [{}] }] },
  ],
});

describe("counting what the runners collected", () => {
  it("counts every test Vitest listed", () => {
    expect(suitesFrom(listed(487), NESTED).unit).toBe(487);
  });

  it("counts tests nested inside suites, and a spec that holds more than one", () => {
    expect(suitesFrom(listed(1), NESTED).endToEnd).toBe(4);
  });

  it("counts a file that collected no test at all as none", () => {
    const barren = JSON.stringify({
      suites: [{ specs: [] }, { specs: [{ tests: [{}] }] }],
    });

    expect(suitesFrom(listed(1), barren).endToEnd).toBe(1);
  });

  it("refuses a unit run that collected nothing", () => {
    expect(() => suitesFrom("[]", NESTED)).toThrow(
      "Vitest collected no test at all",
    );
  });

  it("refuses an end to end run that collected nothing", () => {
    expect(() => suitesFrom(listed(1), JSON.stringify({ suites: [] }))).toThrow(
      "Playwright collected no test at all",
    );
  });
});

describe("the test ratchet", () => {
  it("holds at the ratchet and says the total it held", () => {
    const { lines, passed } = suites({ unit: 480, endToEnd: 6 }, 486);

    expect(passed).toBe(true);
    expect(lines).toContain("| Total | 486 |");
    expect(lines).toContain(
      "The total may not fall below the ratchet in `.footprint.json`, which is 486. At or above it.",
    );
  });

  it("fails one test below the ratchet and names the way through", () => {
    const { lines, passed } = suites({ unit: 479, endToEnd: 6 }, 486);

    expect(passed).toBe(false);
    expect(lines).toContain(
      "The total may not fall below the ratchet in `.footprint.json`, which is 486. Below it. Either put the tests back, or lower the ratchet in this diff, where a reviewer sees it.",
    );
  });

  it("passes a suite that grew past the ratchet", () => {
    expect(suites({ unit: 500, endToEnd: 7 }, 486).passed).toBe(true);
  });

  it("reports each runner's count beside the total", () => {
    const { lines } = suites({ unit: 480, endToEnd: 6 }, 486);

    expect(lines).toContain("| Unit, by Vitest | 480 |");
    expect(lines).toContain("| End to end, by Playwright | 6 |");
  });

  it("says plainly that the mutation gate is what stops the count being gamed", () => {
    expect(suites({ unit: 1, endToEnd: 1 }, 1).lines).toContain(
      "mutation score below is what closes that, because a test that cannot fail leaves a",
    );
  });
});
