import "@testing-library/jest-dom/vitest";
import { REFERENCE } from "@seatscout/client";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ask, cards, FRONT_ROW, staged } from "./app.fixtures.js";

const WEIGHTS = [
  ["Rows away from your target", "1"],
  ["Off to the side", "1"],
  ["The front rows", "0.25"],
  ["Against a wall", "0.25"],
  ["A console between you", "0.25"],
] as const;

const rowOf = (card: HTMLElement) =>
  Number(
    /^Row (\d+) of/.exec(
      within(card).getByText(/^Row \d+ of/).textContent ?? "",
    )?.[1],
  );

const ringOf = (card: Element) =>
  card.querySelector(".mp-target")?.getAttribute("cy");

const opened = async (options: Parameters<typeof staged>[0] = {}) => {
  const stage = staged(options);
  await stage.settled();
  fireEvent.click(screen.getByRole("button", { name: /seat$/i }));
  return { stage, editor: ask() };
};

const slide = (control: HTMLElement, value: number) =>
  fireEvent.change(control, { target: { value: `${value}` } });

const room = () => {
  const drawn = document.querySelector("dialog svg.room");
  if (drawn === null) throw new Error("the sheet draws no room");
  return drawn;
};

describe("where you sit, on the Ask sheet", () => {
  afterEach(cleanup);

  it("opens from the title card's seat line with the depth control ready to change, showing Reference", async () => {
    const { editor } = await opened();

    expect(editor.getByLabelText("How far back")).toHaveFocus();
    expect(editor.getByLabelText("How far back")).toHaveValue("0.67");
    expect(editor.getByLabelText("Left or right")).toHaveValue("0");
    expect(
      editor.getByRole("button", { name: "Back to Reference" }),
    ).toBeDisabled();
    expect(
      editor.getByText(/Reference sits two thirds back on the centreline/),
    ).toBeVisible();
    expect(
      editor.getByText(
        "Preferences and history stay on this phone. No account exists.",
      ),
    ).toBeVisible();
  });

  it("names every penalty as something to mind, each at the weight Reference gives it", async () => {
    const { editor } = await opened();

    for (const [weight, value] of WEIGHTS)
      expect(editor.getByLabelText(weight)).toHaveValue(value);
    expect(editor.getAllByRole("slider")).toHaveLength(WEIGHTS.length + 2);
  });

  it("re-ranks the results under the adjusted target once found, moves the ring on every card to it, and says the seat is custom", async () => {
    const { stage, editor } = await opened();
    const [first] = cards();
    if (first === undefined) throw new Error("no card to compare against");
    const before = { row: rowOf(first), ring: ringOf(first) };

    slide(editor.getByLabelText("How far back"), 0);
    fireEvent.click(editor.getByRole("button", { name: /find seats/i }));
    await stage.settled();

    const [adjusted] = cards();
    if (adjusted === undefined)
      throw new Error("the adjusted search found nothing");
    expect(stage.profiles).toEqual([FRONT_ROW]);
    expect(stage.asked.at(-1)?.profile).toEqual(FRONT_ROW);
    expect(rowOf(adjusted)).toBeLessThan(before.row);
    expect(ringOf(adjusted)).not.toBe(before.ring);
    expect(ringOf(adjusted)).toBe("9");
    expect(screen.getByRole("button", { name: "Custom seat" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Reference seat" })).toBeNull();
  });

  it("takes a weight from its control and carries the rest of the Profile unchanged", async () => {
    const { stage, editor } = await opened();

    slide(editor.getByLabelText("The front rows"), 1.5);
    slide(editor.getByLabelText("Left or right"), -0.5);
    fireEvent.click(editor.getByRole("button", { name: /find seats/i }));

    expect(stage.profiles).toEqual([
      { ...REFERENCE, frontBandWeight: 1.5, targetLateral: -0.5 },
    ]);
  });

  it("keeps a weight between not minding at all and twice what Reference minds most", async () => {
    const { editor } = await opened();

    slide(editor.getByLabelText("Off to the side"), -1);
    expect(editor.getByLabelText("Off to the side")).toHaveValue("0");

    slide(editor.getByLabelText("Off to the side"), 9);
    expect(editor.getByLabelText("Off to the side")).toHaveValue("2");

    slide(editor.getByLabelText("How far back"), 2);
    expect(editor.getByLabelText("How far back")).toHaveValue("1");
  });

  it("says where the target is in words a screen reader can use, never as a bare number", async () => {
    const { editor } = await opened();
    const depth = editor.getByLabelText("How far back");
    const lateral = editor.getByLabelText("Left or right");

    expect(depth).toHaveAttribute("aria-valuetext", "67% of the way back");
    expect(lateral).toHaveAttribute("aria-valuetext", "on the centreline");

    slide(lateral, -0.4);
    expect(lateral).toHaveAttribute(
      "aria-valuetext",
      "40% of the way to house left",
    );

    slide(lateral, 0.25);
    expect(lateral).toHaveAttribute(
      "aria-valuetext",
      "25% of the way to house right",
    );
  });

  it("places the target where the drawn room is pressed, and follows the pointer while it is held down", async () => {
    const { editor } = await opened();
    const drawn = room();
    vi.spyOn(drawn, "getBoundingClientRect").mockReturnValue(
      new DOMRect(100, 200, 320, 230),
    );

    fireEvent.pointerDown(drawn, { clientX: 260, clientY: 245, buttons: 1 });
    expect(editor.getByLabelText("Left or right")).toHaveValue("0");
    expect(editor.getByLabelText("How far back")).toHaveValue("0");

    fireEvent.pointerMove(drawn, { clientX: 340, clientY: 405, buttons: 1 });
    expect(editor.getByLabelText("Left or right")).toHaveValue("0.53");
    expect(editor.getByLabelText("How far back")).toHaveValue("1");

    fireEvent.pointerMove(drawn, { clientX: 100, clientY: 245, buttons: 0 });
    expect(editor.getByLabelText("Left or right")).toHaveValue("0.53");
    expect(editor.getByLabelText("How far back")).toHaveValue("1");
  });

  it("labels the ends of every control in words and never with a number", async () => {
    const { editor } = await opened();

    expect(editor.getByText("Front")).toBeInTheDocument();
    expect(editor.getByText("Back")).toBeInTheDocument();
    expect(editor.getByText("Left")).toBeInTheDocument();
    expect(editor.getByText("Right")).toBeInTheDocument();
    expect(editor.getAllByText("Don't mind")).toHaveLength(WEIGHTS.length);
    expect(editor.getAllByText("Avoid")).toHaveLength(WEIGHTS.length);
  });

  it("draws the room as ten rows behind the screen, two thirds of the width at the front and the whole of it at the back, with the target ringed and lit, and moves the mark as the target does", async () => {
    const { editor } = await opened();
    const drawn = room();
    const rows = [...drawn.querySelectorAll("line.mp-row")].map((row) =>
      ["x1", "y1", "x2"].map((at) => row.getAttribute(at)),
    );

    expect(rows).toHaveLength(10);
    expect(rows[0]).toEqual(["12.2", "9", "51.8"]);
    expect(rows[4]).toEqual(["7.67", "23.22", "56.33"]);
    expect(rows[9]).toEqual(["2", "41", "62"]);
    expect(drawn.querySelector("line.mp-screen")).not.toBeNull();
    expect(drawn.querySelector("circle.mp-target")).toHaveAttribute(
      "cy",
      "30.44",
    );
    expect(drawn.querySelector("circle.mp-pair")).toHaveAttribute(
      "cy",
      "30.44",
    );

    slide(editor.getByLabelText("How far back"), 0.25);
    expect(drawn.querySelector("circle.mp-target")).toHaveAttribute("cy", "17");
    expect(drawn.querySelector("circle.mp-pair")).toHaveAttribute("cy", "17");
  });

  it("goes back to Reference in one press, and the press is offered only while the Profile differs from it", async () => {
    const { stage, editor } = await opened({ profile: FRONT_ROW });
    const reset = editor.getByRole("button", { name: "Back to Reference" });

    expect(reset).toBeEnabled();
    expect(editor.getByLabelText("How far back")).toHaveValue("0");

    fireEvent.click(reset);
    expect(reset).toBeDisabled();
    expect(editor.getByLabelText("How far back")).toHaveValue("0.67");

    fireEvent.click(editor.getByRole("button", { name: /find seats/i }));
    expect(stage.profiles).toEqual([REFERENCE]);
  });

  it("keeps the Profile as it was on the way back", async () => {
    const { stage, editor } = await opened();

    slide(editor.getByLabelText("How far back"), 0);
    fireEvent.click(editor.getByRole("button", { name: /keep as it was/i }));

    expect(stage.profiles).toEqual([]);
    expect(
      screen.getByRole("button", { name: "Reference seat" }),
    ).toBeVisible();
  });

  it("does not run the search again when the sheet closes with nothing changed", async () => {
    const { stage, editor } = await opened();

    fireEvent.click(editor.getByRole("button", { name: /find seats/i }));

    expect(stage.searches).toHaveLength(1);
  });
});
