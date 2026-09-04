import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { opened } from "./auditorium.fixtures.js";
import { WEST_PLANO_28 } from "./rooms.fixtures.js";

const MAP_ON_SCREEN = { left: 20, top: 100, width: 340, height: 204 };

const wrapper = (dialog: HTMLElement) => {
  const group = dialog.querySelector("svg > g");
  if (group === null) throw new Error("the map has no wrapping group");
  return group;
};

const scaleOf = (group: Element) =>
  Number(/scale\(([\d.]+)\)$/.exec(group.getAttribute("transform") ?? "")?.[1]);

const drag = (
  group: Element,
  from: { readonly x: number; readonly y: number },
  to: { readonly x: number; readonly y: number },
) => {
  fireEvent.pointerDown(group, {
    pointerId: 1,
    clientX: from.x,
    clientY: from.y,
  });
  fireEvent.pointerMove(group, { pointerId: 1, clientX: to.x, clientY: to.y });
  fireEvent.pointerUp(group, { pointerId: 1, clientX: to.x, clientY: to.y });
};

describe("panning and zooming the drawn room", () => {
  beforeEach(() => {
    vi.spyOn(SVGElement.prototype, "getBoundingClientRect").mockReturnValue({
      ...MAP_ON_SCREEN,
      right: MAP_ON_SCREEN.left + MAP_ON_SCREEN.width,
      bottom: MAP_ON_SCREEN.top + MAP_ON_SCREEN.height,
      x: MAP_ON_SCREEN.left,
      y: MAP_ON_SCREEN.top,
      toJSON: () => MAP_ON_SCREEN,
    });
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

    expect(zoomedIn).toMatch(
      /^translate\(-\d+(\.\d+)? -\d+(\.\d+)?\) scale\(2\)$/,
    );
    expect(panned).not.toBe(zoomedIn);
    expect(panned).toMatch(/ scale\(2\)$/);
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

  it("moves the roving cell to a Seat the pointer focuses, with the anchor on that Seat", async () => {
    const stage = await opened(WEST_PLANO_28);
    const seat = stage.dialog.querySelector<SVGElement>('[data-seat="J10"]');
    if (seat === null) throw new Error("J10 is not drawn");

    act(() => seat.focus());
    stage.press("ArrowUp");

    expect(stage.focused().getAttribute("aria-label")).toMatch(/^Seat H10\. /);
  });
});
