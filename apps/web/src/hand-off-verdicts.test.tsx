import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { dialog, HOOKY_TICKETING, marks, taken } from "./hand-off.fixtures.js";

const NEXT_BEST = [
  "F6·F7 Row 6 · on the centreline",
  "G8·G9 Row 7 · three seats right of centre",
  "G3·G4 Row 7 · three and a half seats left of centre",
  "E5·E6 Row 5 · one seat left of centre",
  "H3·H4 Row 8 · three and a half seats left of centre",
  "I4·I5 Row 9 · two and a half seats left of centre",
  "H9·H10 Row 8 · four seats right of centre",
  "D5·D6 Row 4 · one seat left of centre",
  "B3·B4 Row 2 · on the centreline",
  "J5·J6 Row 10 · two and a half seats left of centre",
  "I10·I11 Row 9 · five and a half seats right of centre",
  "J12·J13 Row 10 · seven seats right of centre",
  "A6·A7 Row 1 · on the centreline",
  "B9·B10 Row 2 · seven and a half seats right of centre",
];

const NOTHING_LEFT =
  "The Source answered 0s ago and offered nothing else in this room for two seats together. This screening is no longer on offer to you: sold out, already begun, off sale, without a seat map, or simply short of two seats together, and the Source does not say which. seatscout never holds seats.";

describe("what the hand-off says when the answer is not ok", () => {
  afterEach(cleanup);

  it("answers a Seat Group taken since the search with the room's other Seat Groups, ranked, the best already chosen, and opens nothing", async () => {
    const stage = await taken({ statuses: { G6: "X" } });
    const gone = dialog("G6 and G7 just went.");
    const chips = within(
      gone.getByRole("list", { name: "Next best in this room" }),
    ).getAllByRole("button");

    expect(stage.checkouts).toEqual([]);
    expect(gone.getByRole("heading", { level: 2 })).toHaveFocus();
    expect(gone.getByRole("heading", { level: 2 })).toHaveAttribute(
      "tabindex",
      "-1",
    );
    expect(
      gone.getByText(
        "The Source answered 0s ago: at least one of them went while you were deciding. seatscout never holds seats, so the room has moved on. The plan is redrawn.",
      ),
    ).toBeVisible();
    expect(gone.getByText("next best")).toBeVisible();
    expect(gone.getByText("where G6·G7 were")).toBeVisible();
    expect(marks().lost).not.toBeNull();
    expect(marks().pair?.getAttribute("cy")).not.toBe(
      marks().lost?.getAttribute("cy"),
    );
    expect(chips.map((chip) => chip.textContent)).toEqual(NEXT_BEST);
    expect(chips.map((chip) => chip.getAttribute("aria-pressed"))).toEqual([
      "true",
      ...NEXT_BEST.slice(1).map(() => "false"),
    ]);
    expect(gone.getByRole("button", { name: "Take F6 and F7" })).toBeVisible();
    expect(gone.getByText("Re-checked at hand-off · 0s ago")).toBeVisible();
    expect(
      gone.getByText("Judged not bookable · nothing was held"),
    ).toBeVisible();
    expect(
      gone.getByRole("button", { name: "‹ Back to the list" }),
    ).toBeVisible();
    expect(
      gone.getByRole("button", { name: "Back to the list" }),
    ).toBeVisible();

    act(() => stage.advance(8_000));

    expect(gone.getByText(/^The Source answered 8s ago/)).toBeVisible();
    expect(gone.getByText("Re-checked at hand-off · 8s ago")).toBeVisible();
  });

  it("takes a chosen alternative as the new candidate, lights it on the plan, keeps the screen while it is checked, and verifies it in turn before opening", async () => {
    const stage = await taken({ statuses: { G6: "X" } });
    const gone = dialog("G6 and G7 just went.");
    const before = marks().pair?.getAttribute("cx");
    fireEvent.click(gone.getByRole("button", { name: /^G3·G4/ }));

    expect(gone.getByRole("button", { name: /^G3·G4/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(gone.getByRole("button", { name: /^F6·F7/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(marks().pair?.getAttribute("cx")).not.toBe(before);

    stage.holdSeatMaps();
    fireEvent.click(gone.getByRole("button", { name: "Take G3 and G4" }));
    await act(() => Promise.resolve());
    expect(gone.getByRole("status")).toHaveTextContent(
      "Checking G3 and G4 with the Source",
    );
    expect(gone.getByRole("heading", { level: 2 })).toHaveTextContent(
      "G6 and G7 just went.",
    );
    expect(
      gone.getByRole("list", { name: "Next best in this room" }),
    ).toBeVisible();
    expect(gone.getByRole("button", { name: "Take G3 and G4" })).toBeDisabled();
    expect(stage.checkouts).toEqual([]);
    stage.releaseSeatMaps();
    const verified = await stage.answered();

    expect(stage.verifications).toHaveLength(2);
    expect(verified.ok && verified.result.seats.map((seat) => seat.id)).toEqual(
      ["G3", "G4"],
    );
    expect(stage.checkouts).toEqual([HOOKY_TICKETING]);
    expect(gone.getByRole("status")).toHaveTextContent(
      "Still there. Opening the ticketing page for 9:00a at Hooky Entertainment Addison + SDX.",
    );
  });

  it("answers an alternative that has gone too with what is left, the new loss named and focused", async () => {
    const stage = await taken({ statuses: { G6: "X" } });
    const gone = dialog("G6 and G7 just went.");
    fireEvent.click(gone.getByRole("button", { name: /^G3·G4/ }));
    stage.roomAtHandOff({ statuses: { G6: "X", G3: "X" } });
    fireEvent.click(gone.getByRole("button", { name: "Take G3 and G4" }));
    await stage.answered();

    const again = dialog("G3 and G4 just went.");
    expect(again.getByRole("heading", { level: 2 })).toHaveFocus();
    expect(again.getByText("where G3·G4 were")).toBeVisible();
    expect(again.queryByRole("button", { name: /^G3·G4/ })).toBeNull();
    expect(again.getByRole("button", { name: /^F6·F7/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(again.getByRole("button", { name: "Take F6 and F7" })).toBeVisible();
    expect(stage.checkouts).toEqual([]);
  });

  it.each([
    ["the Source refuses the room", { status: 410 }],
    [
      "no run of the party's size is left",
      { statuses: { G7: "A" }, rest: "X" },
    ],
  ])(
    "says the screening is no longer on offer, and offers only the way back, when %s",
    async (_, room) => {
      const stage = await taken(room);
      const gone = dialog(
        "G6 and G7 just went, and nothing in this room replaces them.",
      );

      expect(stage.checkouts).toEqual([]);
      expect(gone.getByRole("heading", { level: 2 })).toHaveFocus();
      expect(gone.getByText(NOTHING_LEFT)).toBeVisible();
      expect(gone.queryByRole("button", { name: /^Take / })).toBeNull();
      expect(gone.queryByRole("list")).toBeNull();
      expect(gone.getByText("Re-checked at hand-off · 0s ago")).toBeVisible();
      expect(
        gone.getByRole("button", { name: "Back to the list" }),
      ).toBeVisible();
    },
  );

  it("opens nothing when the Source cannot be reached, offers the retry, and opens once a retry is answered", async () => {
    const stage = await taken({ status: 500 });
    const unreached = dialog("The Source could not be reached.");

    expect(stage.checkouts).toEqual([]);
    expect(unreached.getByRole("heading", { level: 2 })).toHaveFocus();
    expect(
      unreached.getByText(
        "Nothing was checked, so G6 and G7 may well still be there. A checkout never opens on an answer that could not be judged.",
      ),
    ).toBeVisible();
    expect(unreached.getByText("Hand-off · 0s ago")).toBeVisible();
    expect(
      unreached.getByText("Nothing was read · nothing was held"),
    ).toBeVisible();

    act(() => stage.advance(1_000));
    fireEvent.click(unreached.getByRole("button", { name: "Check again" }));
    await stage.answered();

    expect(unreached.getByText("Hand-off · 0s ago")).toBeVisible();
    expect(unreached.getByRole("heading", { level: 2 })).toHaveFocus();
    expect(stage.checkouts).toEqual([]);

    stage.roomAtHandOff({});
    stage.holdSeatMaps();
    fireEvent.click(unreached.getByRole("button", { name: "Check again" }));
    await act(() => Promise.resolve());
    expect(unreached.getByRole("status")).toHaveTextContent(
      "Checking G6 and G7 with the Source",
    );
    expect(
      unreached.getByRole("button", { name: "Check again" }),
    ).toBeDisabled();
    stage.releaseSeatMaps();
    await stage.answered();

    expect(stage.verifications).toHaveLength(3);
    expect(stage.checkouts).toEqual([HOOKY_TICKETING]);
  });
});
