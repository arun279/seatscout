import "@testing-library/jest-dom/vitest";
import { fakeUpstream } from "@seatscout/client/testing";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { browserClock, browserSeatScout } from "./browser.js";
import { startApp } from "./start.js";

const SEAT_MAP = "/napi/seatMap/";

const opened = (query: string) => {
  const upstream = fakeUpstream({
    seed: 4,
    standInAuditoriums: true,
    standInTheaters: true,
  });
  vi.stubGlobal("fetch", upstream);
  window.history.replaceState(null, "", `/${query}`);
  document.body.replaceChildren(
    Object.assign(document.createElement("div"), { id: "app" }),
  );
  act(() => {
    startApp();
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
    cleanup();
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
    expect(page.cached().toSorted()).toEqual([
      'seatscout.catalogue.v1.["245569","2026-08-28","75006"]',
      'seatscout.programme.v1.["2026-08-28","75006"]',
    ]);
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

    const traversed = new Promise((settle) =>
      window.addEventListener("popstate", settle, { once: true }),
    );
    window.history.back();
    await act(() => traversed);

    expect(window.location.search).toBe(
      "?movie=245569&date=2026-08-28&area=75006&partySize=2",
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Two seats together",
    );
  });

  it("closes the sheet once a query naming another date is found, rather than opening it again on the new query", async () => {
    const page = opened("?movie=245569&date=2026-08-28&area=75006&partySize=2");
    await waitFor(() => expect(page.seatMapsRead()).toBeGreaterThan(0));
    fireEvent.click(
      screen.getByRole("button", { name: /two seats together/i }),
    );
    const ask = within(
      screen.getByRole("dialog", { name: /what are we seeing/i }),
    );
    fireEvent.change(ask.getByLabelText("Date"), {
      target: { value: "2026-08-29" },
    });
    fireEvent.click(ask.getByRole("button", { name: /find seats/i }));

    expect(window.location.search).toBe(
      "?movie=245569&date=2026-08-29&area=75006&partySize=2",
    );
    expect(screen.queryByRole("dialog", { hidden: true })).toBeNull();
    await act(() => new Promise((settle) => setTimeout(settle)));
    expect(screen.queryByRole("dialog", { hidden: true })).toBeNull();
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
