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
import { startApp } from "./start.js";

const SEAT_MAP = "/napi/seatMap/";
const NEARBY = "/napi/nearbyTheaters";

const running: Root[] = [];

const closed = () =>
  act(() => {
    for (const root of running.splice(0)) root.unmount();
  });

const opened = async (query: string) => {
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
    void startApp().then((root) => running.push(root));
  });
  await waitFor(() =>
    expect(screen.getByRole("heading", { level: 1 })).toBeVisible(),
  );
  return {
    seatMapsRead: () =>
      upstream.requests.filter((request) => request.path.startsWith(SEAT_MAP))
        .length,
    areasRead: () =>
      upstream.requests.filter((request) => request.path.startsWith(NEARBY))
        .length,
    cached: () =>
      Object.keys(localStorage).filter((key) =>
        key.startsWith("seatscout.catalogue."),
      ),
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
    const page = await opened(
      "?movie=245569&date=2026-08-28&area=75006&partySize=3",
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Three seats together",
    );
    await waitFor(() => expect(page.seatMapsRead()).toBeGreaterThan(0));
    await waitFor(() =>
      expect(screen.getAllByRole("article").length).toBeGreaterThan(0),
    );
    expect(page.cached()).toContain(
      'seatscout.catalogue.v1.["245569","2026-08-28","75006"]',
    );
    expect(
      within(screen.getAllByRole("article")[0] ?? document.body).getByText(
        /^\d+s$/,
      ),
    ).toBeVisible();
  });

  it("opens a verified Seat Group's ticketing URL as a navigation of the page itself", async () => {
    const query = "?movie=245569&date=2026-08-28&area=75006&partySize=2";
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, search: query, assign });
    await opened(query);
    await waitFor(() =>
      expect(screen.getAllByRole("article").length).toBeGreaterThan(0),
    );
    fireEvent.click(
      within(screen.getAllByRole("article")[0] ?? document.body).getByRole(
        "button",
        { name: /G6·G7$/ },
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Take G6 and G7" }));

    await waitFor(() => expect(assign).toHaveBeenCalledTimes(1));
    expect(assign).toHaveBeenCalledWith(
      expect.stringMatching(/showtimehashcode=v2-[0-9a-f]{64}$/),
    );
  });

  it("opens on the title card with nothing to search when the address names no Movie", async () => {
    const page = await opened("");

    expect(screen.getByRole("button", { name: /which movie/i })).toBeVisible();
    expect(page.seatMapsRead()).toBe(0);
  });

  it("takes today from the device's own calendar day", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 0, 5, 23, 30));
    await opened("");
    fireEvent.click(screen.getByRole("button", { name: /today/i }));

    expect(
      within(screen.getByRole("dialog")).getByLabelText("Date"),
    ).toHaveValue("2026-01-05");
  });

  it("refuses a page with nothing to mount into", async () => {
    document.body.replaceChildren();

    await expect(startApp()).rejects.toThrow("nothing to mount into");
  });

  it("writes an edited query to the address and searches it, and goes back to the one before", async () => {
    const page = await opened(
      "?movie=245569&date=2026-08-28&area=75006&partySize=2&theater=aacbt",
    );
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
      "?movie=245569&date=2026-08-28&area=75006&partySize=3&theater=aacbt",
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Three seats together",
    );

    window.history.back();

    await waitFor(() =>
      expect(window.location.search).toBe(
        "?movie=245569&date=2026-08-28&area=75006&partySize=2&theater=aacbt",
      ),
    );
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Two seats together",
      ),
    );
  });

  it("reads what is playing near the area the query moves to", async () => {
    const page = await opened(
      "?movie=245569&date=2026-08-28&area=75006&partySize=2&theater=aacbt",
    );
    await waitFor(() => expect(page.areasRead()).toBe(1));
    fireEvent.click(
      screen.getByRole("button", { name: /two seats together/i }),
    );
    const ask = within(
      screen.getByRole("dialog", { name: /what are we seeing/i }),
    );

    fireEvent.change(ask.getByLabelText("Near, by postal code"), {
      target: { value: "75234" },
    });
    fireEvent.click(ask.getByRole("button", { name: /find seats/i }));

    await waitFor(() => expect(page.areasRead()).toBe(2));
  });

  it("keeps the film it has read when a chip changes the query and the area and the date do not", async () => {
    await opened(
      "?movie=245569&date=2026-08-28&area=75006&partySize=2&theater=aacbt",
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "The Dog Stars (2026)" }),
      ).toBeVisible(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /two seats together/i }),
    );
    const ask = within(
      screen.getByRole("dialog", { name: /what are we seeing/i }),
    );
    fireEvent.click(ask.getByRole("button", { name: "IMAX" }));
    fireEvent.click(ask.getByRole("button", { name: /find seats/i }));

    expect(
      screen.getByRole("button", { name: "The Dog Stars (2026)" }),
    ).toBeVisible();
  });

  it("leaves the address alone when the sheet closes with the query as it was", async () => {
    await opened("?movie=245569&date=2026-08-28&area=75006&partySize=2");
    const pushed = vi.spyOn(window.history, "pushState");
    fireEvent.click(screen.getByRole("button", { name: /reference seat/i }));
    fireEvent.click(
      within(
        screen.getByRole("dialog", { name: /what are we seeing/i }),
      ).getByRole("button", { name: /find seats/i }),
    );

    expect(pushed).not.toHaveBeenCalled();
  });

  it("takes the sheet a search opened off the screen when Back returns to the query before it", async () => {
    const page = await opened(
      "?movie=245569&date=2026-08-28&area=75006&partySize=2&theater=aacbt",
    );
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

  it("hands back the root it mounted, so unmounting stops the clock ticking into a torn-down tree", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", fakeUpstream({ seed: 4, standInAuditoriums: true }));
    window.history.replaceState(null, "", "/");
    document.body.replaceChildren(
      Object.assign(document.createElement("div"), { id: "app" }),
    );
    await act(async () => {
      running.push(await startApp());
    });

    expect(vi.getTimerCount()).toBe(1);

    closed();

    expect(vi.getTimerCount()).toBe(0);
    expect(document.getElementById("app")?.childElementCount).toBe(0);
  });
});
