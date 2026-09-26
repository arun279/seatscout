import { describe, expect, it } from "vitest";
import { coverageOf, dayCoverageOf, readMoreOf } from "./results-phrases.js";
import {
  covering,
  day,
  reading,
  TODAY,
  TOMORROW,
} from "./results-phrases.fixtures.js";

describe("the coverage of a search over days", () => {
  it("tells what is being read from what is not read yet", () => {
    expect(
      coverageOf(
        reading(covering(172, 20), "searching", [day(TODAY, 20, 28, 124)]),
      ),
    ).toBe("172 candidates · 20 checked · 28 to go · 124 not read yet");
    expect(
      coverageOf(
        reading(covering(172, 48), "settled", [
          day(TODAY, 48, 0, 100),
          day(TOMORROW, 0, 0, 24),
        ]),
      ),
    ).toBe("172 candidates · 48 checked · 124 not read yet");
  });

  it("says the source refused and the search stopped, whether or not anything was read", () => {
    expect(
      coverageOf(
        reading(covering(172, 30), "settled", [day(TODAY, 30, 0, 142)], true),
      ),
    ).toBe(
      "172 candidates · 30 checked · 142 not read yet · the source refused, so the search stopped",
    );
    expect(coverageOf(reading(covering(0, 0), "unreachable", [], true))).toBe(
      "Nothing was read: the source refused, so the search stopped",
    );
  });

  it("names each day with what was read, what is being read and what is not read yet", () => {
    expect(dayCoverageOf(day(TODAY, 48, 0, 124), TODAY)).toBe(
      "Today: 48 read · 124 not read yet",
    );
    expect(dayCoverageOf(day(TOMORROW, 20, 28, 0), TODAY)).toBe(
      "Tomorrow: 20 read · 28 being read",
    );
    expect(dayCoverageOf(day("2026-09-01", 0, 0, 0), TODAY)).toBe(
      "Tue 1 Sep: no seat map to read",
    );
  });
});

describe("reading more", () => {
  it("offers only the days the next 48 rooms fall on", () => {
    expect(
      readMoreOf(
        reading(covering(400, 0), "settled", [
          day(TODAY, 0, 0, 60),
          day(TOMORROW, 0, 0, 30),
        ]),
        TODAY,
      ),
    ).toBe("Read 48 more rooms today");
  });

  it("offers the next rooms by the days they fall on", () => {
    expect(
      readMoreOf(
        reading(covering(400, 48), "settled", [
          day(TODAY, 48, 0, 30),
          day(TOMORROW, 0, 0, 172),
        ]),
        TODAY,
      ),
    ).toBe("Read 48 more rooms today and tomorrow");
    expect(
      readMoreOf(
        reading(covering(400, 48), "settled", [
          day(TODAY, 48, 0, 0),
          day("2026-08-30", 0, 0, 12),
          day("2026-08-31", 0, 0, 100),
        ]),
        TODAY,
      ),
    ).toBe("Read 48 more rooms on Sun 30 Aug and on Mon 31 Aug");
    expect(
      readMoreOf(
        reading(covering(60, 48), "settled", [day(TODAY, 48, 0, 12)]),
        TODAY,
      ),
    ).toBe("Read 12 more rooms today");
  });

  it("offers nothing while reading, once all is read, or after the source refused", () => {
    const unread = [day(TODAY, 20, 28, 124)];

    expect(
      readMoreOf(reading(covering(176, 20), "searching", unread), TODAY),
    ).toBeNull();
    expect(
      readMoreOf(
        reading(covering(48, 48), "settled", [day(TODAY, 48, 0, 0)]),
        TODAY,
      ),
    ).toBeNull();
    expect(
      readMoreOf(
        reading(covering(176, 20), "settled", [day(TODAY, 20, 0, 156)], true),
        TODAY,
      ),
    ).toBeNull();
  });
});
