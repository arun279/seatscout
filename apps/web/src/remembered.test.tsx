import "@testing-library/jest-dom/vitest";
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ASKED,
  editor,
  NO_AREA,
  opened,
  PROFILE,
  RECENT,
  relaunched,
  reset,
  TONIGHT,
} from "./start.fixtures.js";

describe("what the running application remembers on the device", () => {
  afterEach(reset);

  it("remembers nothing while the address names no Movie or no area", async () => {
    await opened(NO_AREA);
    await act(() => Promise.resolve());
    expect(localStorage.getItem(RECENT)).toBeNull();

    await relaunched("?date=2026-08-28&area=75006&partySize=2");
    await act(() => Promise.resolve());
    expect(localStorage.getItem(RECENT)).toBeNull();
  });

  it("remembers a search the address reaches only after the first screen is up", async () => {
    await opened(NO_AREA);
    expect(localStorage.getItem(RECENT)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /near where/i }));
    fireEvent.change(editor().getByLabelText("Near, by postal code"), {
      target: { value: "75006" },
    });
    fireEvent.click(editor().getByRole("button", { name: /find seats/i }));

    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem(RECENT) ?? "[]")).toEqual([ASKED]),
    );
  });

  it("keeps an adjusted Profile on the device, searches under it, and opens with it after a relaunch", async () => {
    await opened(NO_AREA);
    fireEvent.click(screen.getByRole("button", { name: /reference seat/i }));
    fireEvent.change(editor().getByLabelText("Near, by postal code"), {
      target: { value: "75006" },
    });
    fireEvent.change(editor().getByLabelText("How far back"), {
      target: { value: "0.2" },
    });
    fireEvent.click(editor().getByRole("button", { name: /find seats/i }));

    expect(screen.getByRole("button", { name: "Custom seat" })).toBeVisible();
    expect(JSON.parse(localStorage.getItem(PROFILE) ?? "null")).toEqual(
      expect.objectContaining({ targetDepth: 0.2 }),
    );
    await waitFor(() =>
      expect(screen.getAllByRole("article").length).toBeGreaterThan(0),
    );
    expect(
      screen.getAllByRole("article")[0]?.querySelector(".mp-target"),
    ).toHaveAttribute("cy", "15.4");

    await relaunched("");

    expect(screen.getByRole("button", { name: "Custom seat" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Custom seat" }));
    expect(editor().getByLabelText("How far back")).toHaveValue("0.2");
  });

  it("remembers each search it runs on the device and offers it on the first screen, newest first", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 7, 28, 9, 0));
    localStorage.setItem(RECENT, JSON.stringify([{ ...ASKED, partySize: 3 }]));
    await opened(TONIGHT);
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem(RECENT) ?? "[]")).toHaveLength(2),
    );

    await relaunched("");

    expect(
      within(screen.getByRole("region", { name: "Run again" }))
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual([
      "245569Today · Near 75006 · Two seats together",
      "245569Today · Near 75006 · Three seats together",
    ]);
  });

  it("stops offering a remembered search once its day has passed, even while the screen stays open", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    vi.setSystemTime(new Date(2026, 7, 28, 23, 59, 59));
    localStorage.setItem(RECENT, JSON.stringify([ASKED]));
    await opened("");

    expect(screen.getByRole("region", { name: "Run again" })).toBeVisible();

    act(() => {
      vi.advanceTimersByTime(2_000);
    });

    expect(screen.queryByRole("region", { name: "Run again" })).toBeNull();
    expect(screen.getByRole("button", { name: "Today" })).toBeVisible();
  });

  it("re-runs a recent search in one press, reading every seat map again", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 7, 28, 9, 0));
    localStorage.setItem(RECENT, JSON.stringify([ASKED]));
    const page = await opened("");
    expect(page.seatMapsRead()).toBe(0);
    fireEvent.click(
      screen.getByRole("button", {
        name: "245569, today, near 75006, two seats together",
      }),
    );

    expect(window.location.search).toBe(TONIGHT);
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(/172 checked$/),
    );
    expect(page.seatMapsRead()).toBe(172);
    expect(screen.getAllByRole("article").length).toBeGreaterThan(0);
  });
});
