import "@testing-library/jest-dom/vitest";
import { act, cleanup, createEvent, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { opened } from "./auditorium.fixtures.js";
import {
  drag,
  MAP_ON_SCREEN,
  onScreen,
  scaleOf,
  spanOf,
  underPointer,
  viewOf,
  wrapper,
} from "./pan-zoom.fixtures.js";
import { WEST_PLANO_28 } from "./rooms.fixtures.js";

describe("panning and zooming the drawn room", () => {
  beforeEach(() => {
    vi.spyOn(SVGElement.prototype, "getBoundingClientRect").mockImplementation(
      onScreen,
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("opens fitted, zooms about the pointer on a wheel, and pans by dragging, all on the wrapping group's transform and without a single React commit", async () => {
    const stage = await opened(WEST_PLANO_28);
    const group = wrapper(stage.dialog);
    const cells = [...stage.dialog.querySelectorAll('[role="gridcell"]')];
    stage.commits.length = 0;

    expect(group).toHaveAttribute("transform", "translate(0 0) scale(1)");

    fireEvent.wheel(group, { deltaY: -240, clientX: 190, clientY: 202 });
    const zoomedIn = group.getAttribute("transform");
    drag(group, { x: 200, y: 200 }, { x: 150, y: 170 });
    const panned = group.getAttribute("transform");

    expect(zoomedIn).toBe("translate(-277.9 -166.74) scale(2)");
    expect(panned).toBe(
      "translate(-359.63529411764705 -215.78117647058824) scale(2)",
    );
    expect(stage.commits).toEqual([]);
    expect([...stage.dialog.querySelectorAll('[role="gridcell"]')]).toEqual(
      cells,
    );
  });

  it("reads a two-finger spread as a zoom", async () => {
    const stage = await opened(WEST_PLANO_28);
    const group = wrapper(stage.dialog);

    fireEvent.pointerDown(group, { pointerId: 1, clientX: 150, clientY: 200 });
    fireEvent.pointerDown(group, { pointerId: 2, clientX: 250, clientY: 200 });
    fireEvent.pointerMove(group, { pointerId: 2, clientX: 300, clientY: 200 });
    fireEvent.pointerUp(group, { pointerId: 2, clientX: 300, clientY: 200 });
    fireEvent.pointerUp(group, { pointerId: 1, clientX: 150, clientY: 200 });

    expect(scaleOf(group)).toBeCloseTo(1.5, 10);
  });

  it("ignores a pointer that moves without having pressed, and treats a press that barely moves as a tap rather than a drag", async () => {
    const stage = await opened(WEST_PLANO_28);
    const group = wrapper(stage.dialog);
    const seat = stage.dialog.querySelector('[data-seat="G14"]');
    if (seat === null) throw new Error("G14 is not drawn");

    fireEvent.pointerMove(group, { pointerId: 9, clientX: 300, clientY: 300 });
    expect(group).toHaveAttribute("transform", "translate(0 0) scale(1)");

    fireEvent.wheel(group, { deltaY: -240, clientX: 190, clientY: 202 });
    drag(group, { x: 200, y: 200 }, { x: 203, y: 202 });
    fireEvent.click(seat);
    expect(stage.rowBar()).toHaveTextContent("G14 and G13 chosen.");
  });

  it("does not choose a Seat the pointer only dragged across", async () => {
    const stage = await opened(WEST_PLANO_28);
    const group = wrapper(stage.dialog);
    const seat = stage.dialog.querySelector('[data-seat="G14"]');
    if (seat === null) throw new Error("G14 is not drawn");

    fireEvent.wheel(group, { deltaY: -240, clientX: 190, clientY: 202 });
    drag(group, { x: 200, y: 200 }, { x: 120, y: 160 });
    fireEvent.click(seat);

    expect(stage.rowBar()).toHaveTextContent("8th row of 14 from the front");
    expect(stage.room.getByRole("radio", { name: /^H14·H13/ })).toBeChecked();
  });

  it("moves the roving cell to any Seat the pointer focuses, one row down as readily as one row and four seats over, with the anchor on that Seat", async () => {
    const stage = await opened(WEST_PLANO_28);
    const focusOn = (id: string) => {
      const seat = stage.dialog.querySelector<SVGElement>(
        `[data-seat="${id}"]`,
      );
      if (seat === null) throw new Error(`${id} is not drawn`);
      act(() => seat.focus());
    };

    focusOn("J14");

    expect(stage.rowBar()).toHaveTextContent(
      "ROW J9th row of 14 from the front. 18 seats, 1 bookable.",
    );

    focusOn("J10");
    stage.press("ArrowUp");

    expect(stage.focused().getAttribute("aria-label")).toMatch(/^Seat H10\. /);
  });

  it("keeps the Seat under the pointer under it when the wheel zooms a map that has already been panned", async () => {
    const stage = await opened(WEST_PLANO_28);
    const group = wrapper(stage.dialog);
    const pointer = { x: 240, y: 180 };

    fireEvent.wheel(group, { deltaY: -240, clientX: 190, clientY: 202 });
    drag(group, { x: 200, y: 200 }, { x: 150, y: 170 });
    const before = underPointer(group, pointer);
    fireEvent.wheel(group, {
      deltaY: -240,
      clientX: pointer.x,
      clientY: pointer.y,
    });
    const after = underPointer(group, pointer);

    expect(scaleOf(group)).toBeCloseTo(3.9959477124183005, 10);
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
  });

  it("stops zooming in where a Seat is as wide as a tap target, and stays there however far the wheel turns", async () => {
    const stage = await opened(WEST_PLANO_28);
    const group = wrapper(stage.dialog);

    for (let turn = 0; turn < 12; turn += 1)
      fireEvent.wheel(group, { deltaY: -240, clientX: 190, clientY: 202 });
    const capped = group.getAttribute("transform");
    fireEvent.wheel(group, { deltaY: -240, clientX: 190, clientY: 202 });

    expect(scaleOf(group)).toBeCloseTo(3.9959477124183005, 10);
    expect(group.getAttribute("transform")).toBe(capped);
  });

  it("brings the Seat a key moves to back into view when the map is zoomed past it", async () => {
    const stage = await opened(WEST_PLANO_28);
    const group = wrapper(stage.dialog);

    fireEvent.wheel(group, { deltaY: -480, clientX: 190, clientY: 202 });
    const zoomed = viewOf(group);
    stage.press("Home");
    const home = spanOf(group, stage.focused());
    stage.press("PageDown");
    const back = spanOf(group, stage.focused());

    expect(stage.focused().getAttribute("aria-label")).toMatch(/^Seat P25\. /);
    expect(viewOf(group).scale).toBe(zoomed.scale);
    expect(home.left).toBeCloseTo(MAP_ON_SCREEN.left, 6);
    expect(back.bottom).toBeCloseTo(back.frame.bottom, 6);
  });

  it("answers a press and a wheel itself, so the browser neither selects nor scrolls the page", async () => {
    const stage = await opened(WEST_PLANO_28);
    const group = wrapper(stage.dialog);
    const press = createEvent.pointerDown(group, {
      pointerId: 1,
      clientX: 200,
      clientY: 200,
    });
    const turn = createEvent.wheel(group, {
      deltaY: -240,
      clientX: 190,
      clientY: 202,
    });

    fireEvent(group, press);
    fireEvent(group, turn);

    expect(press.defaultPrevented).toBe(true);
    expect(turn.defaultPrevented).toBe(true);
  });

  it("stops listening for the wheel once the room is gone", async () => {
    const stage = await opened(WEST_PLANO_28);
    const group = wrapper(stage.dialog);
    stage.unmount();

    fireEvent.wheel(group, { deltaY: -240, clientX: 190, clientY: 202 });

    expect(group).toHaveAttribute("transform", "translate(0 0) scale(1)");
  });

  it("reads a move of exactly the slop as a tap and one past it as a drag", async () => {
    const stage = await opened(WEST_PLANO_28);
    const group = wrapper(stage.dialog);
    fireEvent.wheel(group, { deltaY: -240, clientX: 190, clientY: 202 });
    const zoomed = group.getAttribute("transform");

    drag(group, { x: 200, y: 200 }, { x: 208, y: 200 });
    const atTheSlop = group.getAttribute("transform");
    drag(group, { x: 200, y: 200 }, { x: 209, y: 200 });

    expect(atTheSlop).toBe(zoomed);
    expect(group.getAttribute("transform")).not.toBe(zoomed);
  });

  it("forgets a finger that has lifted, so the next one pans rather than pinching against it", async () => {
    const stage = await opened(WEST_PLANO_28);
    const group = wrapper(stage.dialog);
    fireEvent.wheel(group, { deltaY: -240, clientX: 190, clientY: 202 });

    fireEvent.pointerDown(group, { pointerId: 1, clientX: 100, clientY: 200 });
    fireEvent.pointerUp(group, { pointerId: 1, clientX: 100, clientY: 200 });
    const before = group.getAttribute("transform");
    drag(group, { x: 200, y: 200 }, { x: 150, y: 170 }, 2);

    expect(before).toBe("translate(-277.9 -166.74) scale(2)");
    expect(group.getAttribute("transform")).toBe(
      "translate(-359.63529411764705 -215.78117647058824) scale(2)",
    );
  });

  it("chooses a Seat tapped before any gesture has happened", async () => {
    const stage = await opened(WEST_PLANO_28);
    const seat = stage.dialog.querySelector('[data-seat="G14"]');
    if (seat === null) throw new Error("G14 is not drawn");

    fireEvent.click(seat);

    expect(stage.rowBar()).toHaveTextContent("G14 and G13 chosen.");
  });

  it("puts focus on the roving cell without letting the page scroll to it", async () => {
    const focus = vi.spyOn(SVGElement.prototype, "focus");
    const stage = await opened(WEST_PLANO_28);

    expect(stage.focused().getAttribute("data-seat")).toBe("H14");
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });
});
