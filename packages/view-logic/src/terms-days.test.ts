import { describe, expect, it } from "vitest";
import { parametersOf, termsFrom, termsOf } from "./terms.js";
import { TODAY } from "./terms.fixtures.js";

describe("the days an address asks about", () => {
  it("reads several dates, a range and any day, and writes each back as it read it", () => {
    for (const dates of [
      ["2026-08-29", "2026-08-31"],
      ["2026-08-29..2026-09-02"],
      ["any"],
    ]) {
      const asked = termsFrom(
        dates.map((date) => ["date", date]),
        TODAY,
      );

      expect(parametersOf(asked)).toEqual([
        ...dates.map((date) => ["date", date]),
        ["partySize", "2"],
      ]);
    }
  });

  it("keeps the nearest day as the date a listing is asked for", () => {
    expect(
      termsFrom(
        [
          ["date", "2026-08-31"],
          ["date", "2026-08-29"],
        ],
        TODAY,
      ),
    ).toEqual({
      date: "2026-08-29",
      when: { kind: "days", dates: ["2026-08-29", "2026-08-31"] },
      partySize: 2,
    });
    expect(termsFrom([["date", "any"]], TODAY).date).toBe(TODAY);
  });

  it("keeps the days a set of terms already holds over the date beside them", () => {
    expect(
      termsOf(
        {
          date: "2026-08-29",
          when: { kind: "range", first: "2026-08-29", last: "2026-09-02" },
        },
        TODAY,
      ),
    ).toEqual({
      date: "2026-08-29",
      when: { kind: "range", first: "2026-08-29", last: "2026-09-02" },
      partySize: 2,
    });
  });

  it("trims a date the address padded", () => {
    expect(termsOf({ date: [" 2026-08-29 "] }, TODAY).date).toBe("2026-08-29");
    expect(termsOf({ date: " 2026-08-29 " }, TODAY).date).toBe("2026-08-29");
  });
});
