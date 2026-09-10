import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  HOOKY_TICKETING,
  opened,
  openedWithoutUnmount,
} from "./hand-off.fixtures.js";
import { cards, staged, TONIGHT } from "./search.fixtures.js";
import { drawn } from "./stylesheet.fixtures.js";

describe("the hand-off", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("opens from a card as a sheet naming the Theater, the time and the Seat Group, with one button that names the seats it takes", async () => {
    const { stage, sheet } = await opened();

    expect(sheet.getByText("Today 9:00a · SDX")).toBeVisible();
    expect(sheet.getByRole("heading", { level: 2 })).not.toHaveFocus();
    expect(sheet.getByText("Row 7 of 10 · on the centreline")).toBeVisible();
    expect(sheet.getByText("G6·G7, yours")).toBeVisible();
    expect(
      sheet.getByText("1 source · 0s ago · judged bookable"),
    ).toBeVisible();
    expect(sheet.getByText("Not confirmed by a second Source")).toBeVisible();
    expect(
      sheet.getByText(
        "Tapping re-checks these seats with the Source, then opens the ticketing page with this showtime selected. seatscout never holds seats.",
      ),
    ).toBeVisible();
    expect(sheet.getByRole("button", { name: "Take G6 and G7" })).toBeVisible();
    expect(
      sheet.getByRole("button", { name: /back to the list/i }),
    ).toBeVisible();

    act(() => stage.advance(8_000));

    expect(
      sheet.getByText("1 source · 8s ago · judged bookable"),
    ).toBeVisible();
  });

  it("verifies first and opens second: nothing opens while the Source has not answered, and what opens is the ticketing URL the verification returned", async () => {
    const { stage, sheet } = await opened();
    stage.holdSeatMaps();
    fireEvent.click(sheet.getByRole("button", { name: "Take G6 and G7" }));
    await act(() => Promise.resolve());

    expect(sheet.getByRole("status")).toHaveTextContent(
      "Checking G6 and G7 with the Source",
    );
    expect(sheet.queryByText(/^Tapping re-checks these seats/)).toBeNull();
    expect(stage.checkouts).toEqual([]);

    fireEvent.click(sheet.getByRole("button", { name: "Take G6 and G7" }));
    expect(stage.verifications).toHaveLength(1);

    stage.releaseSeatMaps();
    const verified = await stage.answered();

    expect(verified.ok).toBe(true);
    expect(stage.checkouts).toEqual([verified.ok && verified.ticketing]);
    expect(stage.checkouts[0]).toBe(HOOKY_TICKETING);
    expect(sheet.getByRole("status")).toHaveTextContent(
      "Still there. Opening the ticketing page for 9:00a at Hooky Entertainment Addison + SDX.",
    );
  });

  it("draws the disabled Take button like a disabled chip", async () => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.disabled = true;
    document.body.append(chip);
    const chipStyle = await drawn("apps/web/public/house.css", () => {
      const style = getComputedStyle(chip);
      return { color: style.color, cursor: style.cursor };
    });

    const { stage, sheet } = await opened();
    stage.holdSeatMaps();
    fireEvent.click(sheet.getByRole("button", { name: "Take G6 and G7" }));
    await act(() => Promise.resolve());

    const buttonStyle = await drawn("apps/web/public/house.css", () => {
      const style = getComputedStyle(
        sheet.getByRole("button", { name: "Take G6 and G7" }),
      );
      return { color: style.color, cursor: style.cursor };
    });

    expect(buttonStyle).toEqual(chipStyle);
  });

  it("opens nothing when the sheet was closed before the Source answered", async () => {
    const { stage, sheet } = await opened();
    stage.holdSeatMaps();
    fireEvent.click(sheet.getByRole("button", { name: "Take G6 and G7" }));
    fireEvent.click(sheet.getByRole("button", { name: /back to the list/i }));

    expect(screen.queryByRole("dialog", { hidden: true })).toBeNull();

    stage.releaseSeatMaps();
    const verified = await stage.answered();

    expect(verified.ok).toBe(true);
    expect(stage.checkouts).toEqual([]);
    expect(screen.queryByRole("dialog", { hidden: true })).toBeNull();
  });

  it("opens nothing when a pending verification answers after the sheet is closed", async () => {
    const { stage, sheet } = await openedWithoutUnmount();
    stage.holdSeatMaps();
    fireEvent.click(sheet.getByRole("button", { name: "Take G6 and G7" }));
    await act(() => Promise.resolve());

    expect(sheet.getByRole("status")).toHaveTextContent(
      "Checking G6 and G7 with the Source",
    );

    await act(() => {
      sheet.getByRole("button", { name: /back to the list/i }).click();
      stage.releaseSeatMaps();
      return Promise.resolve();
    });
    const verified = await stage.answered();
    const closedSheet = screen.getByRole("dialog", { hidden: true });

    expect(verified.ok).toBe(true);
    expect(stage.checkouts).toEqual([]);
    expect(closedSheet).not.toHaveAttribute("open");
    expect(closedSheet).toHaveTextContent("Checking G6 and G7 with the Source");
  });

  it.each([
    [1, /^G7$/, "Take G7"],
    [3, /G6·G7·G8$/, "Take G6, G7 and G8"],
  ])(
    "names the seats of a party of %i as they are spoken",
    async (partySize, seats, spoken) => {
      const { sheet } = await opened(
        { terms: { ...TONIGHT, partySize } },
        seats,
      );

      expect(sheet.getByRole("button", { name: spoken })).toBeVisible();
    },
  );

  it("closes the sheet it opened when it leaves the page without a close", async () => {
    const { stage } = await opened();
    const sheet = screen.getByRole("dialog");
    stage.unmount();

    expect(sheet).not.toHaveAttribute("open");
  });

  it("keeps the search as it was when the sheet is closed", async () => {
    const { stage, sheet } = await opened();
    fireEvent.click(sheet.getByRole("button", { name: /back to the list/i }));

    expect(screen.queryByRole("dialog", { hidden: true })).toBeNull();
    expect(cards().length).toBeGreaterThan(0);
    expect(stage.searches).toHaveLength(1);
    expect(stage.verifications).toEqual([]);
  });

  it("does not offer the sheet while the phone is offline, so the hand-off is unreachable rather than reachable and refusing", async () => {
    const onLine = vi.spyOn(navigator, "onLine", "get");
    const stage = staged();
    await stage.settled();
    const card = () => within(cards()[0] ?? document.body);

    expect(card().getByRole("button", { name: /G6·G7$/ })).toBeVisible();

    onLine.mockReturnValue(false);
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(card().queryByRole("button", { name: /G6·G7$/ })).toBeNull();
    expect(card().getByText("G6·G7")).toBeVisible();

    onLine.mockReturnValue(true);
    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    expect(card().getByRole("button", { name: /G6·G7$/ })).toBeVisible();
  });

  it("withdraws the take control from an open sheet while the phone is offline, then restores it when online returns", async () => {
    const onLine = vi.spyOn(navigator, "onLine", "get");
    const { sheet } = await opened();

    expect(sheet.getByRole("button", { name: "Take G6 and G7" })).toBeVisible();

    onLine.mockReturnValue(false);
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(sheet.queryByRole("button", { name: "Take G6 and G7" })).toBeNull();
    expect(
      sheet.queryByText(/^Tapping re-checks these seats/),
    ).not.toBeInTheDocument();
    expect(sheet.getByRole("status")).toHaveTextContent(
      "Offline. Seats are never cached, so this hand-off can be checked when the connection returns.",
    );

    onLine.mockReturnValue(true);
    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    expect(sheet.getByRole("button", { name: "Take G6 and G7" })).toBeVisible();
    expect(sheet.getByText(/^Tapping re-checks these seats/)).toBeVisible();
  });

  it("opens nothing when a verification answers after the sheet leaves the page", async () => {
    const { stage, sheet } = await opened();
    stage.holdSeatMaps();
    fireEvent.click(sheet.getByRole("button", { name: "Take G6 and G7" }));
    await act(() => Promise.resolve());

    stage.unmount();
    stage.releaseSeatMaps();
    const verified = await stage.answered();

    expect(verified.ok).toBe(true);
    expect(stage.checkouts).toEqual([]);
    expect(screen.queryByRole("dialog", { hidden: true })).toBeNull();
  });
});
