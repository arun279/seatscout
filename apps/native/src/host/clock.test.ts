import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { deviceClock, listingDate, today } from "./clock.js";

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

describe("the clock a freshness count is read from", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("answers with the moment the phone is at", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 11, 5, 19, 41));

    expect(deviceClock().now()).toBe(new Date(2026, 11, 5, 19, 41).getTime());
  });

  it("holds that moment still between turns, so a screen reading it settles", () => {
    jest.useFakeTimers();
    const clock = deviceClock();
    const at = clock.now();
    jest.advanceTimersByTime(2_500);

    expect(clock.now()).toBe(at);
  });

  it("moves it on with each turn while a screen is watching, so freshness climbs", () => {
    jest.useFakeTimers();
    const clock = deviceClock();
    const at = clock.now();

    clock.subscribe(() => undefined);
    jest.advanceTimersByTime(2_000);

    expect(clock.now()).toBe(at + 2_000);
  });

  it("tells a watching screen the second has turned, once a second", () => {
    jest.useFakeTimers();
    const turned = jest.fn<() => void>();

    deviceClock().subscribe(turned);
    jest.advanceTimersByTime(3_000);

    expect(turned).toHaveBeenCalledTimes(3);
  });

  it("keeps one turn for however many screens are watching", () => {
    jest.useFakeTimers();
    const turned = jest.fn<() => void>();
    const again = jest.fn<() => void>();
    const clock = deviceClock();

    clock.subscribe(turned);
    const stop = clock.subscribe(again);
    jest.advanceTimersByTime(2_000);
    stop();
    jest.advanceTimersByTime(1_000);

    expect(turned).toHaveBeenCalledTimes(3);
    expect(again).toHaveBeenCalledTimes(2);
  });

  it("stops telling it once the screen has looked away", () => {
    jest.useFakeTimers();
    const turned = jest.fn<() => void>();

    const stop = deviceClock().subscribe(turned);
    jest.advanceTimersByTime(2_000);
    stop();
    jest.advanceTimersByTime(5_000);

    expect(turned).toHaveBeenCalledTimes(2);
  });

  it("stops turning once the last screen has looked away, so it holds its moment and leaves no timer running", () => {
    jest.useFakeTimers();
    const clock = deviceClock();

    const stop = clock.subscribe(() => undefined);
    jest.advanceTimersByTime(2_000);
    stop();
    const heldAt = clock.now();
    jest.advanceTimersByTime(5_000);

    expect(clock.now()).toBe(heldAt);
    expect(jest.getTimerCount()).toBe(0);
  });
});
