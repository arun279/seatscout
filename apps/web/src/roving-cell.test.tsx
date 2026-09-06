import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { opened } from "./auditorium.fixtures.js";
import {
  LAKE_HIGHLANDS_1,
  VILLAGE_1,
  WEST_PLANO_28,
} from "./rooms.fixtures.js";

const nameOf = (element: Element) => element.getAttribute("aria-label");

describe("the roving cell under D45's keys", () => {
  afterEach(cleanup);

  it.each([
    ["ArrowRight", "H13"],
    ["ArrowLeft", "H15"],
    ["ArrowDown", "J14"],
    ["ArrowUp", "G14"],
    ["Home", "H25"],
    ["End", "H1"],
    ["PageUp", "A14"],
    ["PageDown", "P14"],
  ])(
    "moves focus with %s from H14 in the 304-seat room, driven by a real key event",
    async (key, label) => {
      const stage = await opened(WEST_PLANO_28);
      stage.press(key);

      expect(nameOf(stage.focused())).toMatch(new RegExp(`^Seat ${label}\\. `));
      expect(stage.focused()).toHaveAttribute("tabindex", "0");
      expect(
        stage.dialog.querySelectorAll('[role="gridcell"][tabindex="0"]'),
      ).toHaveLength(1);
    },
  );

  it("leaves a key D45 does not bind alone, and keeps what the bar says when the Seat the cursor already holds takes focus again", async () => {
    const stage = await opened(WEST_PLANO_28);

    stage.press("a");
    stage.press("Escape");
    expect(nameOf(stage.focused())).toMatch(/^Seat H14\. /);
    expect(stage.rowBar()).toHaveTextContent(
      "ROW H8th row of 14 from the front. 20 seats, 12 bookable.",
    );

    stage.press("Enter");
    expect(stage.rowBar()).toHaveTextContent(
      "H14 and H13 chosen. They are re-checked when you continue.",
    );

    const here = stage.dialog.querySelector<SVGElement>('[data-seat="H14"]');
    act(() => here?.focus());
    expect(stage.rowBar()).toHaveTextContent(
      "H14 and H13 chosen. They are re-checked when you continue.",
    );

    const neighbour =
      stage.dialog.querySelector<SVGElement>('[data-seat="H13"]');
    act(() => neighbour?.focus());
    expect(stage.rowBar()).toHaveTextContent(
      "ROW H8th row of 14 from the front. 20 seats, 12 bookable.",
    );
  });

  it("takes Ctrl+Home to the front row's first Seat and Ctrl+End to the back row's last, in the numeric room", async () => {
    const stage = await opened(LAKE_HIGHLANDS_1);

    stage.press("Home", { ctrlKey: true });
    expect(nameOf(stage.focused())).toMatch(/^Seat 101\. /);
    stage.press("End", { ctrlKey: true });
    expect(nameOf(stage.focused())).toMatch(/^Seat 919\. /);
  });

  it("keeps the lateral anchor across vertical moves, so Up-Up-Down-Down through the AMC accessible row comes home to G14", async () => {
    const stage = await opened(VILLAGE_1);

    stage.press("ArrowUp");
    expect(nameOf(stage.focused())).toMatch(/^Seat F14\. /);
    stage.press("ArrowUp");
    expect(nameOf(stage.focused())).toBe(
      "Seat WC13. One seat left of centre. Wheelchair space. Bookable, and kept out of ordinary results.",
    );
    stage.press("ArrowDown");
    stage.press("ArrowDown");
    expect(nameOf(stage.focused())).toMatch(/^Seat G14\. /);
  });

  it("keeps what the bar last said when the roving cell is left and returned to, because the choice has not changed", async () => {
    const stage = await opened(WEST_PLANO_28);
    stage.press("Enter");
    const cell = stage.dialog.querySelector<SVGElement>('[data-seat="H14"]');
    if (cell === null) throw new Error("H14 is not drawn");

    act(() => cell.blur());
    act(() => cell.focus());

    expect(stage.rowBar()).toHaveTextContent(
      "H14 and H13 chosen. They are re-checked when you continue.",
    );
  });

  it("moves the roving cell to a Seat a tap lands on, and reads that Seat's row from there", async () => {
    const stage = await opened(WEST_PLANO_28);
    const seat = stage.dialog.querySelector('[data-seat="G17"]');
    if (seat === null) throw new Error("G17 is not drawn");

    fireEvent.click(seat);
    stage.press("ArrowUp");

    expect(nameOf(stage.focused())).toMatch(/^Seat F17\. /);
  });
});
