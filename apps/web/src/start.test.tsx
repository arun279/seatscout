import "@testing-library/jest-dom/vitest";
import { fakeUpstream } from "@seatscout/client/testing";
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { browserClock, browserSeatScout } from "./browser.js";
import { startApp } from "./start.js";

const SEAT_MAP = "/napi/seatMap/";

const running: Root[] = [];

const closed = () =>
  act(() => {
    for (const root of running.splice(0)) root.unmount();
  });

const opened = (query: string) => {
  const upstream = fakeUpstream({ seed: 4, standInAuditoriums: true });
  vi.stubGlobal("fetch", upstream);
  window.history.replaceState(null, "", `/${query}`);
  document.body.replaceChildren(
    Object.assign(document.createElement("div"), { id: "app" }),
  );
  act(() => {
    running.push(startApp());
  });
  return {
    seatMapsRead: () =>
      upstream.requests.filter((request) => request.path.startsWith(SEAT_MAP))
        .length,
    cached: () =>
      Object.keys(localStorage).filter((key) => key.startsWith("seatscout.")),
  };
};

describe("starting the application in a browser", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    closed();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("reads the query from the address, searches through the page's own fetch, and keeps the listing in Web Storage", async () => {
    const page = opened("?movie=245569&date=2026-08-28&area=75006&partySize=3");

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Three seats together",
    );
    await waitFor(() => expect(page.seatMapsRead()).toBeGreaterThan(0));
    await waitFor(() =>
      expect(screen.getAllByRole("article").length).toBeGreaterThan(0),
    );
    expect(page.cached()).toHaveLength(1);
    expect(
      within(screen.getAllByRole("article")[0] ?? document.body).getByText(
        /^\d+s$/,
      ),
    ).toBeVisible();
  });

  it("opens on the title card with nothing to search when the address names no Movie", () => {
    const page = opened("");

    expect(screen.getByRole("button", { name: /which movie/i })).toBeVisible();
    expect(page.seatMapsRead()).toBe(0);
  });

  it("takes today from the device's own calendar day", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 0, 5, 23, 30));
    opened("");
    fireEvent.click(screen.getByRole("button", { name: /today/i }));

    expect(
      within(screen.getByRole("dialog")).getByLabelText("Date"),
    ).toHaveValue("2026-01-05");
  });

  it("refuses a page with nothing to mount into", () => {
    document.body.replaceChildren();

    expect(() => startApp()).toThrow("nothing to mount into");
  });

  it("writes an edited query to the address and searches it, and goes back to the one before", async () => {
    const page = opened("?movie=245569&date=2026-08-28&area=75006&partySize=2");
    await waitFor(() => expect(page.seatMapsRead()).toBeGreaterThan(0));
    fireEvent.click(
      screen.getByRole("button", { name: /two seats together/i }),
    );
    const ask = within(
      screen.getByRole("dialog", { name: /what are we seeing/i }),
    );
    fireEvent.click(ask.getByRole("button", { name: /more/i }));
    fireEvent.click(ask.getByRole("button", { name: /find seats/i }));

    expect(window.location.search).toBe(
      "?movie=245569&date=2026-08-28&area=75006&partySize=3",
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Three seats together",
    );

    window.history.back();

    await waitFor(() =>
      expect(window.location.search).toBe(
        "?movie=245569&date=2026-08-28&area=75006&partySize=2",
      ),
    );
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Two seats together",
      ),
    );
  });

  it("takes the sheet a search opened off the screen when Back returns to the query before it", async () => {
    const page = opened("?movie=245569&date=2026-08-28&area=75006&partySize=2");
    await waitFor(() => expect(page.seatMapsRead()).toBeGreaterThan(0));
    fireEvent.click(
      screen.getByRole("button", { name: /two seats together/i }),
    );
    const ask = within(
      screen.getByRole("dialog", { name: /what are we seeing/i }),
    );
    fireEvent.click(ask.getByRole("button", { name: /more/i }));
    fireEvent.click(ask.getByRole("button", { name: /find seats/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /ledger/i })).toBeVisible(),
    );
    fireEvent.click(screen.getByRole("button", { name: /ledger/i }));

    expect(screen.getByRole("dialog", { name: /accounted/i })).toBeVisible();

    window.history.back();

    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Two seats together",
      ),
    );
    expect(screen.queryByRole("dialog", { hidden: true })).toBeNull();
  });

  it("hands back the root it mounted, so unmounting stops the clock ticking into a torn-down tree", () => {
    vi.useFakeTimers();
    opened("?movie=245569&date=2026-08-28&area=75006&partySize=2");

    expect(vi.getTimerCount()).toBe(1);

    closed();

    expect(vi.getTimerCount()).toBe(0);
    expect(document.getElementById("app")?.childElementCount).toBe(0);
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
