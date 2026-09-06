import "@testing-library/jest-dom/vitest";
import type { Auditorium } from "@seatscout/client";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { opened } from "./auditorium.fixtures.js";
import {
  openedRooms,
  STRIKE_AND_REEL_1,
  VILLAGE_1,
  WEST_PLANO_28,
} from "./rooms.fixtures.js";
import { SeatMap } from "./seat-map.js";
import { opened as openedAt } from "./traversal.js";

describe("the drawn room", () => {
  afterEach(cleanup);

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
    expect(new Set(labels.map((label) => label.getAttribute("x"))).size).toBe(
      1,
    );
    expect(Number(labels[0]?.getAttribute("x"))).toBeCloseTo(-7.2, 10);
    expect(labels[0]).toHaveAttribute("font-size", "12.6");
    expect(large.dialog.querySelector('[role="row"]')?.textContent).toBe("A");
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

  it("declares one pattern per state a wheelchair or companion space can be drawn in, each a ground and a centre dot", async () => {
    const stage = await opened(VILLAGE_1);
    const patterns = [
      ...stage.dialog.querySelectorAll("svg.seat-map > defs > pattern"),
    ];

    expect(patterns.map((pattern) => pattern.getAttribute("id"))).toEqual([
      "space-bookable",
      "space-unbookable",
      "space-lit",
    ]);
    expect(
      patterns.map((pattern) =>
        pattern.firstElementChild?.getAttribute("class"),
      ),
    ).toEqual([
      "space-ground bookable",
      "space-ground unbookable",
      "space-ground lit",
    ]);
    expect(patterns[0]?.lastElementChild?.getAttribute("class")).toBe(
      "space-dot",
    );
    expect(patterns[0]?.lastElementChild?.getAttribute("r")).toBe("0.16");
  });

  it("marks a Seat no offered group holds as one activation refuses, and leaves a Seat an offer holds alone", async () => {
    const stage = await opened(WEST_PLANO_28);
    const seat = (id: string) =>
      stage.dialog.querySelector(`[data-seat="${id}"]`);

    expect(seat("H14")).not.toHaveAttribute("aria-disabled");
    expect(seat("G14")).not.toHaveAttribute("aria-disabled");
    expect(seat("G17")).toHaveAttribute("aria-disabled", "true");
    expect(seat("A14")).toHaveAttribute("aria-disabled", "true");
  });

  it("draws a room whose Seats are not all one size against the widest and the tallest of them", async () => {
    const [room] = await openedRooms(undefined, [STRIKE_AND_REEL_1]);
    if (room === undefined) throw new Error("the room offered nothing");
    const [first, ...rest] = room.auditorium.map.rows;
    if (first === undefined) throw new Error("the room has no rows");
    const [corner, ...others] = first.seats;
    if (corner === undefined) throw new Error("the row has no seats");
    const stretched: Auditorium = {
      ...room.auditorium,
      map: {
        ...room.auditorium.map,
        rows: [
          {
            ...first,
            seats: [
              {
                ...corner,
                y: corner.y - 4,
                width: corner.width + 6,
                height: corner.height + 10,
              },
              ...others,
            ],
          },
          ...rest,
        ],
      },
    };
    render(
      <SeatMap
        auditorium={stretched}
        result={room.result}
        candidate={room.result}
        cursor={openedAt(stretched)}
        accessibleSeating={false}
        onCursor={() => {}}
        onActivate={() => {}}
      />,
    );
    const label = document.querySelector('[role="rowheader"]');

    expect(Number(label?.getAttribute("x"))).toBeCloseTo(
      -1.6 * (corner.width + 6) + 1.2 * (corner.width + 6),
      10,
    );
    expect(Number(label?.getAttribute("font-size"))).toBeCloseTo(
      0.7 * (corner.width + 6),
      10,
    );
    expect(Number(label?.getAttribute("y"))).toBeCloseTo(
      corner.y - 4 + (corner.height + 10) / 2,
      10,
    );
  });
});
