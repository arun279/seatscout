import { REFERENCE } from "@seatscout/client";
import { describe, expect, it, jest } from "@jest/globals";
import type { ProgrammeState, Term, Terms } from "@seatscout/view-logic";
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { TitleCard } from "./title-card.js";

const TODAY = "2026-09-19";

const NAMED: readonly (readonly [string, Term])[] = [
  ["Two seats together", "partySize"],
  ["Which movie?", "movie"],
  ["Today", "date"],
  ["Near where?", "area"],
  ["Any showtime", "formats"],
  ["Reference seat", "profile"],
];

const NOTHING_READ: ProgrammeState = {
  phase: "none",
  movies: [],
  theaters: [],
};

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

const SHORT: Terms = { date: TODAY, partySize: 2 };

const styleOf = (name: string) =>
  StyleSheet.flatten(screen.getByText(name).props["style"]);

describe("the title card's third line", () => {
  it("puts a separator between values and none before the first", async () => {
    await card(SHORT);

    expect(screen.getAllByText(" · ")).toHaveLength(3);
  });

  it("joins two values of one term with the word the term itself carries", async () => {
    await card({ ...SHORT, formats: ["IMAX", "Dolby Cinema"] });

    expect(screen.getByText(" or ")).toBeOnTheScreen();
    expect(screen.getAllByText(" · ")).toHaveLength(3);
  });
});

describe("a term a person can press", () => {
  it("is underlined, so what can be pressed is not told by colour alone", async () => {
    await card(SHORT);

    expect(styleOf("Today")).toMatchObject({
      textDecorationLine: "underline",
      textDecorationStyle: "dotted",
    });
  });

  it("reports the term it stands for, and no neighbour's, wherever the lines sit", async () => {
    const asked = jest.fn<(term: Term) => void>();
    await card(SHORT, asked);

    for (const [words] of NAMED)
      await fireEvent.press(screen.getByRole("button", { name: words }));

    expect(asked.mock.calls.flat()).toEqual(NAMED.map(([, term]) => term));
  });
});

describe("the rule under a term", () => {
  it("is drawn in a tone of its own on each line, so the marquee does not shout it", async () => {
    await card(SHORT);

    const announced = styleOf("Two seats together").textDecorationColor;
    const attested = styleOf("Today").textDecorationColor;

    expect(String(announced)).toMatch(/^#[0-9a-f]{6}$/);
    expect(String(attested)).toMatch(/^#[0-9a-f]{6}$/);
    expect(announced).not.toBe(attested);
  });
});

describe("the film the card announces", () => {
  it("asks for a film it has not been given in the tone the card's own eyebrow takes", async () => {
    await card(SHORT);

    expect(styleOf("Which movie?").color).toBe(
      styleOf("Your query · tap any line to change it").color,
    );
  });

  it("draws the film it was given in a tone of its own, not the one that asks for it", async () => {
    await card(SHORT);
    const asking = styleOf("Which movie?").color;
    await cleanup();

    await card({ ...SHORT, movie: "Spider-Man: Brand New Day" });
    const named = styleOf("Spider-Man: Brand New Day").color;

    expect(String(asking)).toMatch(/^#[0-9a-f]{6}$/);
    expect(String(named)).toMatch(/^#[0-9a-f]{6}$/);
    expect(named).not.toBe(asking);
  });
});
