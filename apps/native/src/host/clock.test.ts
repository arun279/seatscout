import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { listingDate, today } from "./clock.js";

describe("the date a listing is asked for", () => {
  it("pads a single-digit month and day, and stays on the day the phone is on late at night", () => {
    expect(listingDate(new Date(2026, 0, 9, 23, 30))).toBe("2026-01-09");
  });

  it("stays on the day the phone is on just after midnight", () => {
    expect(listingDate(new Date(2026, 8, 19, 0, 30))).toBe("2026-09-19");
  });
});

describe("what day the phone says it is", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("reads the day off the phone's own clock", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 11, 5, 19, 41));

    expect(today()).toBe("2026-12-05");
  });
});
