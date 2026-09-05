import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { opened } from "./auditorium.fixtures.js";
import {
  LAKE_HIGHLANDS_1,
  VILLAGE_1,
  WEST_PLANO_28,
} from "./rooms.fixtures.js";

const nameOf = (element: Element) => element.getAttribute("aria-label");

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

    expect(zoomedIn).toBe("translate(-277.9 -166.74) scale(2)");
    expect(panned).toBe(
      "translate(-441.3705882352941 -264.82235294117646) scale(2)",
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

  it("moves the roving cell to a Seat the pointer focuses, with the anchor on that Seat", async () => {
    const stage = await opened(WEST_PLANO_28);
    const seat = stage.dialog.querySelector<SVGElement>('[data-seat="J10"]');
    if (seat === null) throw new Error("J10 is not drawn");

    act(() => seat.focus());
    stage.press("ArrowUp");

    expect(stage.focused().getAttribute("aria-label")).toMatch(/^Seat H10\. /);
  });

  it("draws each labelled row's label as its row header, a console tick between two pods, and the frame padded by the seats' own width", async () => {
    const large = await opened(WEST_PLANO_28);
    const labels = [...large.dialog.querySelectorAll('[role="rowheader"]')];
    const viewBox = (
      large.dialog.querySelector("svg.seat-map")?.getAttribute("viewBox") ?? ""
    )
      .split(" ")
      .map(Number);
    const inner = large.dialog.querySelector("svg.seat-map > g > g");

    expect(labels.map((label) => label.textContent)).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "J",
      "K",
      "L",
      "M",
      "N",
      "P",
    ]);
    expect(labels.map((label) => label.getAttribute("y"))).toEqual([
      "9",
      "49",
      "69",
      "89",
      "109",
      "129",
      "149",
      "169",
      "189",
      "229",
      "249",
      "269",
      "289",
      "309",
    ]);
    expect(viewBox.map((edge) => Number(edge.toFixed(3)))).toEqual([
      0, 0, 555.8, 336,
    ]);
    expect(inner).toHaveAttribute("transform", "translate(28.8 9)");
    expect(large.dialog.querySelectorAll("svg.seat-map .tick")).toHaveLength(0);
    cleanup();

    const pods = await opened(VILLAGE_1);
    const ticks = [...pods.dialog.querySelectorAll("svg.seat-map .tick")];
    const [first] = ticks;

    expect(
      [...pods.dialog.querySelectorAll('[role="rowheader"]')].map(
        (label) => label.textContent,
      ),
    ).toEqual(["A", "B", "C", "D", "F", "G", "H", "J", "K"]);
    expect(ticks).toHaveLength(133);
    expect(Number(first?.getAttribute("x1"))).toBeCloseTo(60.3925, 3);
    expect(Number(first?.getAttribute("x2"))).toBeCloseTo(60.3925, 3);
    expect(Number(first?.getAttribute("y1"))).toBeCloseTo(2.8532, 3);
    expect(Number(first?.getAttribute("y2"))).toBeCloseTo(11.4128, 3);
  });

  it("gives every Seat the classes its vocabulary is drawn from, and rounds a Seat by its own width", async () => {
    const pods = await opened(VILLAGE_1);
    const classOf = (id: string) =>
      pods.dialog.querySelector(`[data-seat="${id}"]`)?.getAttribute("class");
    const lit = pods.dialog.querySelector('[data-seat="G14"]');
    expect(classOf("G14")).toBe("seat bookable recommended lit");
    expect(classOf("E23")).toBe("seat unbookable");
    expect(classOf("WC17")).toBe("seat bookable space");
    expect(classOf("A30")).toBe("seat bookable");
    expect(Number(lit?.getAttribute("rx"))).toBeCloseTo(
      0.18 * Number(lit?.getAttribute("width")),
      10,
    );
    expect(lit?.getAttribute("tabindex")).toBe("0");
    expect([
      ...pods.dialog.querySelectorAll('[role="gridcell"][tabindex="-1"]'),
    ]).toHaveLength(293);
  });
});

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
});
