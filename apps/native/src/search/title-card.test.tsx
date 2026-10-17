import { describe, expect, it, jest } from "@jest/globals";
import { REFERENCE } from "@seatscout/client";
import type { ProgrammeState, Term, Terms } from "@seatscout/view-logic";
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { buttonsIn } from "../../test/buttons.js";
import { houseLights } from "../../test/lights.js";
import { TitleCard } from "./title-card.js";

const TODAY = "2026-09-19";

const NAMED: readonly (readonly [string, Term])[] = [
  ["Two seats together", "partySize"],
  ["Near where?", "area"],
  ["Which movie?", "movie"],
  ["Today", "date"],
  ["Any time", "window"],
  ["Any theater", "narrowing"],
  ["Reference seat", "profile"],
];

const NOTHING_READ: ProgrammeState = {
  phase: "none",
  movies: [],
  theaters: [],
};

const SHORT: Terms = { date: TODAY, partySize: 2 };

const NEAR: Terms = { ...SHORT, area: "75234" };

const card = async (terms: Terms, onEdit: (term: Term) => void = () => {}) => {
  await render(
    <TitleCard
      onEdit={onEdit}
      profile={REFERENCE}
      programme={NOTHING_READ}
      terms={terms}
      today={TODAY}
    />,
  );
};

const colourOf = (words: string) =>
  String(StyleSheet.flatten(screen.getByText(words).props["style"]).color);

const colourIn = async (terms: Terms, words: string) => {
  await card(terms);
  const colour = colourOf(words);
  await cleanup();
  return colour;
};

describe("a term a person can press", () => {
  it("opens the editor it stands for, and no neighbour's, wherever it sits", async () => {
    const asked = jest.fn<(term: Term) => void>();
    await card(SHORT, asked);

    for (const [words] of NAMED)
      await fireEvent.press(screen.getByRole("button", { name: words }));

    expect(asked.mock.calls.flat()).toEqual(NAMED.map(([, term]) => term));
  });

  it("is named by its words alone, not by the chevron beside them", async () => {
    await card(NEAR);

    expect(
      screen.getByRole("button", { name: "Near 75234" }),
    ).toBeOnTheScreen();
    expect(screen.getAllByText("›")).toHaveLength(3);
  });
});

describe("the light on the term to name next", () => {
  it("falls on the area while there is none, and leaves it once it is named", async () => {
    const asking = await colourIn(SHORT, "Near where?");
    const named = await colourIn(NEAR, "Near 75234");

    expect(asking).toMatch(/^#[0-9a-f]{6}$/);
    expect(named).not.toBe(asking);
    expect(named).toBe(await colourIn(SHORT, "Two seats together"));
  });

  it("moves to the film once the area is named", async () => {
    expect(await colourIn(NEAR, "Which movie?")).toBe(
      await colourIn(SHORT, "Near where?"),
    );
  });
});

describe("the film before an area is named", () => {
  it("is drawn faint, apart from both the lit term and a plain one", async () => {
    const faint = await colourIn(SHORT, "Which movie?");

    expect(faint).toMatch(/^#[0-9a-f]{6}$/);
    expect(faint).not.toBe(await colourIn(SHORT, "Near where?"));
    expect(faint).not.toBe(await colourIn(SHORT, "Two seats together"));
  });

  it("is drawn faint even when the query carries a film, because it cannot be searched for without an area", async () => {
    const carried = await colourIn(
      { ...SHORT, movie: "246329", title: "Spider-Man: Brand New Day" },
      "Spider-Man: Brand New Day",
    );

    expect(carried).toBe(await colourIn(SHORT, "Which movie?"));
  });

  it("tells a screen reader it needs an area first, and stops saying so once there is one", async () => {
    await card(SHORT);
    expect(screen.getByRole("button", { name: "Which movie?" })).toHaveProp(
      "accessibilityHint",
      "Name an area first.",
    );
    await cleanup();

    await card(NEAR);
    expect(screen.getByRole("button", { name: "Which movie?" })).not.toHaveProp(
      "accessibilityHint",
    );
  });

  it("still opens the film's editor, which says what to do", async () => {
    const asked = jest.fn<(term: Term) => void>();
    await card(SHORT, asked);

    await fireEvent.press(screen.getByRole("button", { name: "Which movie?" }));

    expect(asked).toHaveBeenCalledWith("movie");
  });
});

describe("the chips under the rows", () => {
  it("gathers the day and time When, and the theaters and the seat Where, after the three rows", async () => {
    await card({ ...NEAR, accessibleSeating: true });

    expect(buttonsIn("title-card")).toEqual([
      "Two seats together",
      "Near 75234",
      "Which movie?",
      "Today",
      "Any time",
      "Any theater",
      "Accessible seating",
      "Reference seat",
    ]);
    expect(screen.getByText("When")).toBeOnTheScreen();
    expect(screen.getByText("Where")).toBeOnTheScreen();
  });

  it("draws one chip for each value that narrows the showtimes", async () => {
    await card({ ...NEAR, formats: ["IMAX", "Dolby Cinema"] });

    expect(screen.getByRole("button", { name: "IMAX" })).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Dolby Cinema" }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Any theater" })).toBeNull();
  });
});

describe("the strip under the term to name next", () => {
  const stripOf = (words: string) =>
    StyleSheet.flatten(screen.getByText(words).parent?.props["style"]);

  it("lies under the lit term in the beam, and under no other", async () => {
    houseLights("down");
    await card(SHORT);

    expect(stripOf("Near where?")).toMatchObject({
      borderBottomColor: "#b3dff5",
      borderBottomWidth: 3,
    });
    expect(stripOf("Two seats together").borderBottomWidth).toBeUndefined();
    expect(stripOf("Which movie?").borderBottomWidth).toBeUndefined();
  });

  it("moves to the film once the area is named", async () => {
    await card(NEAR);

    expect(stripOf("Which movie?").borderBottomWidth).toBe(3);
    expect(stripOf("Near 75234").borderBottomWidth).toBeUndefined();
  });
});

describe("the rows' chevrons", () => {
  const chevrons = async (terms: Terms) => {
    houseLights("down");
    await card(terms);
    const drawn = screen
      .getAllByText("›")
      .map((one) => StyleSheet.flatten(one.props["style"]).color);
    await cleanup();
    return drawn;
  };

  it("leave the film without one until an area is named, since it cannot open a list yet", async () => {
    expect(await chevrons(SHORT)).toEqual(["#a0a8b5", "#b3dff5"]);
    expect(await chevrons(NEAR)).toEqual(["#a0a8b5", "#a0a8b5", "#b3dff5"]);
  });
});

describe("the film the card announces", () => {
  it("draws the film it was given in a tone of its own, apart from the lit term", async () => {
    houseLights("down");
    const named = await colourIn(
      { ...NEAR, movie: "246329", title: "Spider-Man: Brand New Day" },
      "Spider-Man: Brand New Day",
    );

    expect(named).toBe("#f798a4");
    expect(named).not.toBe(await colourIn(NEAR, "Which movie?"));
    expect(named).not.toBe(await colourIn(NEAR, "Near 75234"));
  });
});
