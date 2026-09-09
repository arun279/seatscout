import "@testing-library/jest-dom/vitest";
import { fakeUpstream } from "@seatscout/client/testing";
import { waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { browserAddress, browserClock, browserSeatScout } from "./browser.js";

const SEAT_MAP = "/napi/seatMap/";

describe("what the browser gives the application", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("tells its watchers the query before when the browser goes back to it", async () => {
    window.history.replaceState(null, "", "/?partySize=2");
    const address = browserAddress();
    const seen: string[] = [];
    const stop = address.subscribe(() => seen.push(address.query()));

    address.go("?partySize=3");
    window.history.back();

    await waitFor(() => expect(seen).toEqual(["?partySize=3", "?partySize=2"]));
    stop();
  });
  it("ticks its clock once a second while someone listens, and not after", () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const clock = browserClock();
    const ticks: number[] = [];
    const stop = clock.subscribe(() => ticks.push(clock.now()));

    vi.advanceTimersByTime(2_500);
    stop();
    vi.advanceTimersByTime(2_000);

    expect(ticks).toEqual([11_000, 12_000]);
    expect(clock.now()).toBe(12_000);
  });
  it("waits between retries with the page's own timers", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      fakeUpstream({
        seed: 4,
        standInAuditoriums: true,
        sequences: { [`${SEAT_MAP}558117351`]: [500] },
      }),
    );
    let settled = false;
    void browserSeatScout()
      .search({
        movie: "245569",
        date: "2026-08-28",
        area: "75006",
        partySize: 2,
        accessibleSeating: false,
      })
      .done.then(() => {
        settled = true;
      });

    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(settled).toBe(true);
  });
});
