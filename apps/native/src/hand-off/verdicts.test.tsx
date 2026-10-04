import { beforeAll, describe, expect, it } from "@jest/globals";
import { act, fireEvent, screen, within } from "@testing-library/react-native";
import {
  NotificationFeedbackType,
  notificationAsync,
  selectionAsync,
} from "expo-haptics";
import {
  HOOKY_ADDISON,
  HOOKY_TICKETING,
  OFFLINE_HERE,
  opened,
  take,
  taken,
} from "../../test/hand-off.js";
import { houseLights } from "../../test/lights.js";
import { StyleSheet } from "react-native";
import { WARM_UP, warmTheCorpus } from "../../test/rooms.js";
import type { Appearance } from "../theme.js";

const BEST = "F13·F12, Row 6 · on the centreline";

const SECOND = "D12·D11, Row 4 · on the centreline";

const RANKED_ALTERNATIVES = [
  BEST,
  SECOND,
  "C11·C10, Row 3 · on the centreline",
  "E7·E6, Row 5 · six seats right of centre",
  "B14·B13, Row 2 · on the centreline",
  "E18·E17, Row 5 · seven and a half seats left of centre",
  "G13·G12, Row 7 · on the centreline",
  "A14·A13, Row 1 · on the centreline",
];

const NOTHING_LEFT =
  "The Source answered 0s ago and offered nothing else in this room for two seats together. This screening is no longer on offer to you: sold out, no longer offered by the listing, already begun, off sale, without a seat map, or simply short of two seats together, and the Source does not say which. seatscout never holds seats.";

interface Inks {
  readonly appearance: Appearance;
  readonly beam: string;
  readonly velvetLit: string;
  readonly hairline: string;
}

const INKS: readonly Inks[] = [
  {
    appearance: "down",
    beam: "#b3dff5",
    velvetLit: "#f798a4",
    hairline: "#323748",
  },
  {
    appearance: "up",
    beam: "#213a53",
    velvetLit: "#940331",
    hairline: "#cabdaa",
  },
];

const styled = (testID: string) =>
  StyleSheet.flatten(screen.getByTestId(testID).props["style"]);

const hidden = { includeHiddenElements: true } as const;

const heading = () => screen.getByRole("header");

beforeAll(warmTheCorpus, WARM_UP);

describe("the taken verdict", () => {
  it("names the seats that went, warns, and offers the room's other Seat Groups ranked with the best already chosen", async () => {
    const { clock } = await taken({ statuses: { E12: "X" } });

    expect(heading()).toHaveTextContent("E12 and E11 just went.");
    expect(notificationAsync).toHaveBeenLastCalledWith(
      NotificationFeedbackType.Warning,
    );
    expect(
      screen.getByText(
        "The Source answered 0s ago: at least one of them went while you were deciding. seatscout never holds seats, so the room has moved on. The plan is redrawn.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("next best")).toBeOnTheScreen();
    expect(screen.getByText("where E12·E11 were")).toBeOnTheScreen();
    expect(screen.getByTestId("lost", hidden)).toBeOnTheScreen();
    expect(screen.getByText("Next best in this room")).toBeOnTheScreen();
    expect(
      screen
        .getAllByRole("radio")
        .map((chip) => String(chip.props["accessibilityLabel"])),
    ).toEqual(RANKED_ALTERNATIVES);
    expect(screen.getByRole("radio", { name: BEST })).toBeChecked();
    expect(screen.getAllByRole("radio", { checked: true })).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: "Take F13 and F12" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText("Re-checked at hand-off · 0s ago"),
    ).toBeOnTheScreen();
    expect(
      screen.getByText("Judged not bookable · nothing was held"),
    ).toBeOnTheScreen();

    await act(() => clock.advance(8_000));

    expect(screen.getByText(/^The Source answered 8s ago/)).toBeOnTheScreen();
    expect(
      screen.getByText("Re-checked at hand-off · 8s ago"),
    ).toBeOnTheScreen();
  });

  it("takes a chosen alternative as the Chosen with a tick, and verifies it in turn before opening", async () => {
    const counter = await taken({ statuses: { E12: "X" } });

    await fireEvent.press(screen.getByRole("radio", { name: SECOND }));

    expect(selectionAsync).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("radio", { name: SECOND })).toBeChecked();
    expect(screen.getByRole("radio", { name: BEST })).not.toBeChecked();

    counter.holdSeatMaps();
    await take("D12 and D11");
    await screen.findByText("Checking D12 and D11 with the Source");

    expect(screen.queryAllByRole("radio")).toEqual([]);
    expect(screen.queryByText("Next best in this room")).toBeNull();
    expect(screen.getByTestId("lost", hidden)).toBeOnTheScreen();
    expect(counter.checkout).not.toHaveBeenCalled();

    counter.releaseSeatMaps();
    await counter.answered();

    expect(counter.checkout.mock.calls).toEqual([[HOOKY_TICKETING]]);
  });

  it("says nothing in the room replaces the seats when there is no next best, and offers only the way back", async () => {
    const counter = await taken({ others: "X" });

    expect(heading()).toHaveTextContent(
      "E12 and E11 just went, and nothing in this room replaces them.",
    );
    expect(screen.getByText(NOTHING_LEFT)).toBeOnTheScreen();
    expect(screen.queryByTestId("velvet")).toBeNull();
    expect(screen.queryAllByRole("radio")).toEqual([]);
    expect(screen.queryByTestId("lost", hidden)).toBeNull();

    await fireEvent.press(
      within(screen.getByTestId("dock")).getByRole("button", {
        name: "Back to the list",
      }),
    );

    expect(counter.onClose).toHaveBeenCalledTimes(1);
    expect(counter.checkout).not.toHaveBeenCalled();
  });
});

describe("the unreachable verdict", () => {
  it("says nothing was checked, offers to check again, and opens only once a check is answered", async () => {
    const counter = await taken({ status: 500 });

    expect(heading()).toHaveTextContent("The Source could not be reached.");
    expect(screen.queryByText(/^Tapping re-checks/)).toBeNull();
    expect(notificationAsync).not.toHaveBeenCalledWith(
      NotificationFeedbackType.Warning,
    );
    expect(
      screen.getByText(
        "Nothing was checked, so E12 and E11 may well still be there. A checkout never opens on an answer that could not be judged.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("Hand-off · 0s ago")).toBeOnTheScreen();
    expect(
      screen.getByText("Nothing was read · nothing was held"),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Check again" }));
    await counter.answered();

    expect(counter.checkout).not.toHaveBeenCalled();

    counter.roomAtHandOff({});
    await fireEvent.press(screen.getByRole("button", { name: "Check again" }));
    await counter.answered();

    expect(counter.checkout.mock.calls).toEqual([[HOOKY_TICKETING]]);
  });
});

describe.each(INKS)("under house lights $appearance", (inks) => {
  const { appearance } = inks;

  it("keys the plan in the ink the plan draws in, and rules the provenance off", async () => {
    houseLights(appearance);
    await taken({ statuses: { E12: "X" } });

    expect(styled("lit-mark").backgroundColor).toBe(inks.beam);
    expect(styled("lost-mark").borderColor).toBe(inks.velvetLit);
    expect(styled("provenance").borderTopColor).toBe(inks.hairline);
  });

  it("draws the sheet as it opens", async () => {
    houseLights(appearance);
    await opened();

    expect(heading()).toHaveTextContent(HOOKY_ADDISON);
  });

  it("draws the check in flight", async () => {
    houseLights(appearance);
    const counter = await opened();
    counter.holdSeatMaps();
    await take("E12 and E11");

    expect(
      await screen.findByText("Checking E12 and E11 with the Source"),
    ).toBeOnTheScreen();
    counter.releaseSeatMaps();
    await counter.answered();
  });

  it("draws the confirmed verdict", async () => {
    houseLights(appearance);
    const counter = await opened();
    await take("E12 and E11");
    await counter.answered();

    expect(screen.getByText(/^Still there/)).toBeOnTheScreen();
  });

  it("draws the taken verdict", async () => {
    houseLights(appearance);
    await taken({ statuses: { E12: "X" } });

    expect(heading()).toHaveTextContent("E12 and E11 just went.");
  });

  it("draws the unreachable verdict", async () => {
    houseLights(appearance);
    await taken({ status: 500 });

    expect(heading()).toHaveTextContent("The Source could not be reached.");
  });

  it("draws the sheet offline", async () => {
    houseLights(appearance);
    await opened(false);

    expect(screen.getByText(OFFLINE_HERE)).toBeOnTheScreen();
  });
});
