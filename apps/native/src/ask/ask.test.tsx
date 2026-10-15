import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { REFERENCE } from "@seatscout/client";
import type { Term } from "@seatscout/view-logic";
import { fireEvent, screen, within } from "@testing-library/react-native";
import { AccessibilityInfo, TextInput } from "react-native";
import { asking, NEAR, PLAYING, SHORT, submit, WHOLE } from "../../test/ask.js";

const EDITORS: readonly (readonly [Term, string, () => unknown])[] = [
  [
    "area",
    "Near where?",
    () => screen.queryByLabelText("Near, by postal code"),
  ],
  ["movie", "Which movie?", () => screen.queryByLabelText("Film")],
  ["date", "When?", () => screen.queryByRole("button", { name: "One day" })],
  [
    "window",
    "What time?",
    () => screen.queryByRole("button", { name: "From, Any time" }),
  ],
  [
    "partySize",
    "How many seats?",
    () => screen.queryByRole("button", { name: "More seats" }),
  ],
  [
    "showtimes",
    "Which showtimes?",
    () => screen.queryByRole("button", { name: "IMAX" }),
  ],
  ["profile", "Where you sit", () => screen.queryByLabelText("How far back")],
];

const press = async (name: string) => {
  await fireEvent.press(screen.getByRole("button", { name }));
};

const dock = () => within(screen.getByTestId("dock"));

afterEach(() => {
  jest.restoreAllMocks();
});

describe("an editor for one term", () => {
  for (const [term, heading] of EDITORS)
    it(`holds the ${term} under its own heading, and no other term`, async () => {
      await asking({ focus: term, terms: NEAR });

      expect(screen.getByRole("header", { name: heading })).toBeOnTheScreen();
      expect(
        EDITORS.map(([held, , control]) => [held, control() !== null]),
      ).toEqual(EDITORS.map(([held]) => [held, held === term]));
    });

  it("holds accessible seating with the party, because both say which seats", async () => {
    await asking({ focus: "partySize", terms: NEAR });

    expect(screen.getByLabelText("Accessible seating")).toBeOnTheScreen();
  });

  it("opens at the step the query needs when it is not told which term", async () => {
    await asking({ terms: NEAR });

    expect(
      screen.getByRole("header", { name: "Which movie?" }),
    ).toBeOnTheScreen();
  });

  it("opens at the area when the query needs nothing more and no term was named", async () => {
    await asking({ terms: WHOLE });

    expect(
      screen.getByRole("header", { name: "Near where?" }),
    ).toBeOnTheScreen();
  });

  it("keeps everything as it was when the way back is pressed", async () => {
    const kept = jest.fn();
    await asking({ onKeep: kept, terms: NEAR, focus: "partySize" });

    await press("Keep as it was");

    expect(kept).toHaveBeenCalledTimes(1);
  });
});

describe("the film before an area is named", () => {
  it("says to name an area first, and why, and offers no field and no list", async () => {
    await asking({ focus: "movie", terms: SHORT, playing: PLAYING });

    expect(screen.getByText("Name an area first.")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "The films listed here are the ones playing near it, so there is nothing to pick from yet.",
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByLabelText("Film")).toBeNull();
  });

  it("offers to go to the area, and goes there on a tap", async () => {
    await asking({ focus: "movie", terms: SHORT });

    await fireEvent.press(dock().getByRole("button", { name: "Name an area" }));

    expect(
      screen.getByRole("header", { name: "Near where?" }),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText("Near, by postal code")).toBeOnTheScreen();
  });
});

describe("the button in the dock", () => {
  it("names the area while there is none, and says so above it", async () => {
    await asking({ focus: "date", terms: SHORT });

    expect(
      dock().getByText("Name an area, then a movie playing near it."),
    ).toBeOnTheScreen();
    expect(
      dock().getByRole("button", { name: "Name an area" }),
    ).toBeOnTheScreen();
  });

  it("names the film once the area is typed, and moves the sheet on to the films playing there", async () => {
    await asking({ focus: "area", playing: PLAYING });

    await fireEvent.changeText(
      screen.getByLabelText("Near, by postal code"),
      "75234",
    );
    expect(
      dock().getByText("Pick a movie playing near 75234."),
    ).toBeOnTheScreen();
    await press("Pick a movie");

    expect(
      screen.getByRole("header", { name: "Which movie?" }),
    ).toBeOnTheScreen();
    expect(
      await screen.findByRole("button", { name: "Akira" }),
    ).toBeOnTheScreen();
  });

  it("puts the cursor in the field when the step it names is the one already open", async () => {
    const focused = jest.spyOn(TextInput.prototype, "focus");
    await asking({ focus: "area" });
    focused.mockClear();

    await press("Name an area");

    expect(focused).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("header", { name: "Near where?" }),
    ).toBeOnTheScreen();
  });

  it("finds seats once a film is picked, and says nothing more above it", async () => {
    const { found } = await asking({
      focus: "movie",
      terms: NEAR,
      playing: PLAYING,
    });

    await fireEvent.press(await screen.findByRole("button", { name: "Akira" }));
    await submit();

    expect(found).toHaveBeenCalledWith(
      { ...NEAR, movie: "23184", title: "Akira" },
      REFERENCE,
    );
    expect(dock().queryByText(/^Name an area|^Pick a movie/)).toBeNull();
  });

  it("carries what one editor changed through the steps that follow it, and hands it all out together", async () => {
    const { found } = await asking({
      focus: "partySize",
      terms: SHORT,
      playing: PLAYING,
    });

    await press("More seats");
    await press("Name an area");
    await fireEvent.changeText(
      screen.getByLabelText("Near, by postal code"),
      "75234",
    );
    await press("Pick a movie");
    await fireEvent.press(await screen.findByRole("button", { name: "Akira" }));
    await submit();

    expect(found).toHaveBeenCalledWith({ ...WHOLE, partySize: 3 }, REFERENCE);
  });

  it("hands out nothing until the query can run", async () => {
    const { found } = await asking({ focus: "partySize", terms: SHORT });

    await press("Name an area");

    expect(found).not.toHaveBeenCalled();
  });
});

describe("where the screen reader starts", () => {
  for (const [focus, terms] of [
    ["movie", NEAR],
    ["area", SHORT],
  ] as const)
    it(`stays on the ${focus} field when that field takes the keyboard`, async () => {
      const moved = jest.spyOn(AccessibilityInfo, "sendAccessibilityEvent");
      moved.mockClear();

      await asking({ focus, terms });

      expect(moved).not.toHaveBeenCalled();
    });

  it("moves to the heading when the editor has no field", async () => {
    const moved = jest.spyOn(AccessibilityInfo, "sendAccessibilityEvent");
    moved.mockClear();

    await asking({ focus: "partySize", terms: NEAR });

    expect(moved.mock.calls.map(([, event]) => event)).toEqual(["focus"]);
  });

  it("moves to the heading of the film when there is no area, because there is no field", async () => {
    const moved = jest.spyOn(AccessibilityInfo, "sendAccessibilityEvent");
    moved.mockClear();

    await asking({ focus: "movie", terms: SHORT });

    expect(moved.mock.calls.map(([, event]) => event)).toEqual(["focus"]);
  });

  it("leaves the screen reader on the field the sheet moves on to", async () => {
    const moved = jest.spyOn(AccessibilityInfo, "sendAccessibilityEvent");
    await asking({ focus: "partySize", terms: SHORT });
    moved.mockClear();

    await press("Name an area");

    expect(moved).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Near, by postal code")).toHaveProp(
      "autoFocus",
      true,
    );
  });
});
