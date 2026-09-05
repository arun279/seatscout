import "@testing-library/jest-dom/vitest";
import type { Verified } from "@seatscout/client";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { opened } from "./auditorium.fixtures.js";
import {
  ANGELIKA_5,
  STRIKE_AND_REEL_1,
  VILLAGE_1,
  WEST_PLANO_28,
} from "./rooms.fixtures.js";

const nameOf = (element: Element) => element.getAttribute("aria-label");

const SPACES = "wheelchair or companion, kept out of ordinary results";

const settledDom = () => act(() => Promise.resolve());

describe("the room a result opens into", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("opens from a card into a dialog that names the Theater, the time and the query, with the recommended pair lit and the reasons set like a billing block", async () => {
    const stage = await opened(WEST_PLANO_28);

    expect(stage.dialog).toHaveAccessibleName("Cinemark Frisco Square and XD");
    expect(
      stage.room.getByText(/^Two seats together · Today 10:10p/),
    ).toBeVisible();
    expect(
      stage.room.getByRole("button", { name: "‹ Back to the list" }),
    ).toBeVisible();
    expect(stage.room.getByText("Row 8 of 14")).toBeVisible();
    expect(stage.room.getByText("On the centreline")).toBeVisible();
    expect(
      stage.room.getByText("Clear of the front rows and the walls"),
    ).toBeVisible();
    expect(stage.room.getByText("279 of 304 not bookable")).toBeVisible();
    expect(stage.room.getByText("1 source · read 0s ago")).toBeVisible();
    expect(
      stage.room.getByText("Not confirmed by a second source"),
    ).toBeVisible();
  });

  it("is six tab stops whatever the room: back, the row bar, back to the recommendation, the map, the alternates and the dock", async () => {
    const small = await opened(STRIKE_AND_REEL_1);
    const smallStops = small.tabStops();
    cleanup();
    const large = await opened(WEST_PLANO_28);

    expect(smallStops).toEqual([
      "button:‹ Back to the list",
      "button:ROW D4th row of 5 from the front. 10 seats, 4 bookable.",
      "button:Back to D8 D7",
      "gridcell",
      "radiogroup:candidate",
      "button:Continue at AMC",
    ]);
    expect(large.tabStops()).toHaveLength(6);
    expect(large.dialog.querySelectorAll('[role="gridcell"]')).toHaveLength(
      304,
    );
    expect(
      large.dialog.querySelectorAll('[role="gridcell"][tabindex="0"]'),
    ).toHaveLength(1);
  });

  it("opens with focus on the first Seat of the recommended Seat Group, and the grid names the group, so reaching it costs no keystroke", async () => {
    const stage = await opened(WEST_PLANO_28);

    expect(nameOf(stage.focused())).toBe(
      "Seat H14. On the centreline. Bookable. First of your two recommended seats.",
    );
    expect(stage.focused()).toHaveAttribute("role", "gridcell");
    expect(stage.grid()).toHaveAccessibleName(
      "Seat map of Cinemark Frisco Square and XD at 10:10p. 304 seats in 14 rows, 25 bookable. Recommended: H14 and H13, 8th row of 14, on the centreline. Arrow keys move one seat.",
    );
  });

  it("emits a row index on every drawn row and never a column index", async () => {
    const stage = await opened(WEST_PLANO_28);
    const rows = [...stage.dialog.querySelectorAll('[role="row"]')];

    expect(rows.map((row) => row.getAttribute("aria-rowindex"))).toEqual(
      Array.from({ length: 14 }, (_, at) => `${at + 1}`),
    );
    expect(stage.dialog.querySelector("[aria-colindex]")).toBeNull();
  });

  it("gives every Seat focus, the not bookable and the accessible ones included, and refuses only their activation with a named reason", async () => {
    const small = await opened(STRIKE_AND_REEL_1);
    small.press("ArrowUp");
    const space = small.focused();
    small.press(" ");
    const refusedSpace = small.rowBar().textContent;
    small.press("ArrowDown");
    small.press("Home");
    const gone = small.focused();
    small.press("Enter");

    expect(nameOf(space)).toMatch(/^Seat C8\. /);
    expect(space).toHaveAttribute("aria-disabled", "true");
    expect(refusedSpace).toBe(
      "Seat C8 is a wheelchair space. Ask for accessible seating in the query to include it.",
    );
    expect(nameOf(gone)).toBe(
      "Seat D11. Six seats left of centre. Not bookable.",
    );
    expect(gone).toHaveAttribute("aria-disabled", "true");
    expect(small.rowBar()).toHaveTextContent(
      "Seat D11 is not bookable, so no seats together can include it.",
    );
    expect(small.handedOff).toEqual([]);
  });

  it("lists the room's other Seat Groups as one radiogroup in the list's own words, with the recommendation chosen, and a button that returns focus to it", async () => {
    const stage = await opened(WEST_PLANO_28);
    const chosen = stage.room.getByRole("radio", {
      name: "H14·H13 Row 8 of 14 · on the centreline",
    });
    const other = stage.room.getByRole("radio", {
      name: "G14·G13 Row 7 of 14 · on the centreline",
    });
    stage.press("PageUp");

    expect(chosen).toBeChecked();
    expect(other).not.toBeChecked();
    expect(stage.room.getByText("2 pairs in this room.")).toBeVisible();
    expect(nameOf(stage.focused())).toMatch(/^Seat A14\. /);

    fireEvent.click(
      stage.room.getByRole("button", { name: "Back to H14 H13" }),
    );
    expect(nameOf(stage.focused())).toMatch(/^Seat H14\. /);
  });

  it("makes a different Seat Group the hand-off candidate from the alternates, and that candidate verifies", async () => {
    const stage = await opened(WEST_PLANO_28);
    fireEvent.click(stage.room.getByRole("radio", { name: /^G14·G13/ }));
    fireEvent.click(
      stage.room.getByRole("button", { name: "Continue at Cinemark Theatres" }),
    );
    const candidate = stage.handedOff[0];
    if (candidate === undefined) throw new Error("nothing was handed off");
    const verified: Verified = await stage.verify(candidate);

    expect(candidate.seats.map((seat) => seat.id)).toEqual(["G14", "G13"]);
    expect(candidate.showtime.id).toBe(WEST_PLANO_28.showtime);
    expect(verified.ok).toBe(true);
    expect(verified.ok && verified.result.seats.map((seat) => seat.id)).toEqual(
      ["G14", "G13"],
    );
    expect(verified.ok && verified.ticketing).toMatch(/^https:\/\//);
  });

  it("makes the best Seat Group containing the focused Seat the candidate on Enter, says so in the row bar, and marks it selected on the map", async () => {
    const stage = await opened(ANGELIKA_5);
    stage.press("ArrowDown");
    stage.press("Enter");
    const selected = [
      ...stage.dialog.querySelectorAll('[aria-selected="true"]'),
    ].map(nameOf);

    expect(stage.rowBar()).toHaveTextContent(
      "M11 and M10 chosen. They are re-checked when you continue.",
    );
    expect(stage.room.getByRole("radio", { name: /^M11·M10/ })).toBeChecked();
    expect(selected.map((name) => name?.slice(0, 8))).toEqual([
      "Seat M11",
      "Seat M10",
    ]);
    expect(
      stage.room.getByRole("button", { name: "Continue at Cinemark Theatres" }),
    ).toBeVisible();
  });

  it("closes on the back button and leaves nothing open", async () => {
    const stage = await opened(STRIKE_AND_REEL_1);
    fireEvent.click(
      stage.room.getByRole("button", { name: "‹ Back to the list" }),
    );
    await settledDom();

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("reads the legend and the billing line off what is lit, so choosing a penalised pair says so, and drops the console entry from a room with no pods", async () => {
    const pods = await opened(VILLAGE_1);
    const billing = () =>
      [...pods.dialog.querySelectorAll(".billing span")].map(
        (span) => span.textContent,
      );

    expect(
      pods.room.getAllByRole("listitem").map((entry) => entry.textContent),
    ).toEqual([
      "G14·G13, yours",
      "bookable",
      "not bookable",
      SPACES,
      "console",
    ]);
    expect(billing()).toEqual([
      "Row 7 of 10",
      "On the centreline",
      "Clear of the front rows and the walls",
    ]);
    expect(pods.room.getByText("3 of 294 not bookable")).toBeVisible();

    const wall = pods.dialog.querySelector<SVGElement>('[data-seat="K17"]');
    act(() => wall?.focus());
    pods.press("Enter");

    expect(billing()).toEqual([
      "Row 10 of 10",
      "One seat left of centre",
      "Against a wall",
    ]);
    cleanup();

    const plain = await opened(WEST_PLANO_28);

    expect(
      plain.room.getAllByRole("listitem").map((entry) => entry.textContent),
    ).toEqual(["H14·H13, yours", "bookable", "not bookable", SPACES]);
  });

  it("opens offline and puts the reason where the action would have been, because continuing re-checks the seats", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const stage = await opened(WEST_PLANO_28);

    expect(
      stage.room.queryByRole("button", { name: /^Continue at/ }),
    ).toBeNull();
    expect(
      stage.room.getByText(
        "Offline. Continuing re-checks these seats at Cinemark Theatres, so it waits for the connection.",
      ),
    ).toBeVisible();
    expect(stage.grid()).toBeVisible();
    expect(stage.handedOff).toEqual([]);
  });
});
