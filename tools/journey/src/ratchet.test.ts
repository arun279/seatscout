import { describe, expect, it } from "vitest";
import { firstSeatGroupsIn, judged } from "./ratchet.ts";

const BASE = [100, 200, 300];

describe("reading the moments a journey wrote down", () => {
  it("reads the first-Seat-Groups moment out of every journey", () => {
    expect(
      firstSeatGroupsIn(
        '[{"firstSeatGroupsMs":210,"lcp":50},{"firstSeatGroupsMs":330,"lcp":60}]',
      ),
    ).toEqual([210, 330]);
  });

  it("reads an empty run as no journeys", () => {
    expect(firstSeatGroupsIn("[]")).toEqual([]);
  });

  it("refuses samples that are not a list of journeys carrying the moment", () => {
    expect(firstSeatGroupsIn('{"firstSeatGroupsMs":1}')).toBeNull();
    expect(firstSeatGroupsIn('[{"lcp":50}]')).toBeNull();
    expect(firstSeatGroupsIn('[{"firstSeatGroupsMs":"soon"}]')).toBeNull();
    expect(firstSeatGroupsIn("[null]")).toBeNull();
  });

  it("lets a file that is not JSON at all throw, because that is a broken pipeline rather than a slow journey", () => {
    expect(() => firstSeatGroupsIn("not json")).toThrow(SyntaxError);
  });
});

describe("holding the head's journey to the merge base's", () => {
  it("refuses a head that measured no journey, whatever the base did", () => {
    const verdict = judged([], BASE);

    expect(verdict.passed).toBe(false);
    expect(verdict.report).toContain("the head measured no journey");
  });

  it("refuses a base that measured no journey rather than passing over it", () => {
    const verdict = judged([250], []);

    expect(verdict.passed).toBe(false);
    expect(verdict.report).toContain("the merge base measured no journey");
  });

  it("reports the head's median alone when the merge base has no journey to compare against", () => {
    const verdict = judged([400, 200, 300], null);

    expect(verdict.passed).toBe(true);
    expect(verdict.report).toContain("no journey at the merge base");
    expect(verdict.report).toContain("300 ms");
  });

  it("goes red when the head's typical journey is slower than the base's slowest", () => {
    const verdict = judged([600, 400, 500], BASE);

    expect(verdict.passed).toBe(false);
    expect(verdict.report).toContain("500 ms");
    expect(verdict.report).toContain("300 ms");
    expect(verdict.report).toContain("slower");
  });

  it("stays green while the head's typical journey is within the base's slowest, equal included", () => {
    expect(judged([270, 250, 260], BASE).passed).toBe(true);
    expect(judged([300, 300, 300], BASE).passed).toBe(true);
    expect(judged([301, 200], BASE).passed).toBe(true);
    expect(judged([302, 300], BASE).passed).toBe(false);
  });

  it("takes the median of an even number of journeys between the two middle ones", () => {
    expect(judged([100, 700, 500, 200], [400]).report).toContain("350 ms");
  });
});
