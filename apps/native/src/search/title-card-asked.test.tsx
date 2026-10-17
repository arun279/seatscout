import { describe, expect, it, jest } from "@jest/globals";
import { REFERENCE } from "@seatscout/client";
import type { ProgrammeState, Term, Terms } from "@seatscout/view-logic";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { buttonsIn } from "../../test/buttons.js";
import { houseLights } from "../../test/lights.js";
import { AskedCard } from "./title-card.js";

const TODAY = "2026-09-19";

const NOTHING_READ: ProgrammeState = {
  phase: "none",
  movies: [],
  theaters: [],
};
const NAMED_FILM: Terms = {
  date: TODAY,
  partySize: 2,
  area: "75234",
  movie: "246329",
  title: "Spider-Man: Brand New Day",
};

const asked = async (
  terms: Terms = NAMED_FILM,
  onEdit: (term: Term) => void = () => {},
) => {
  await render(
    <AskedCard
      onEdit={onEdit}
      profile={REFERENCE}
      programme={NOTHING_READ}
      terms={terms}
      today={TODAY}
    />,
  );
};

const sizeOf = (words: string) =>
  Number(StyleSheet.flatten(screen.getByText(words).props["style"]).fontSize);

describe("the card that states a Query once it has been asked", () => {
  it("reads the film first as the page's title, then the party and the area, then the chips in the Search screen's order", async () => {
    await asked();

    expect(buttonsIn("asked-card")).toEqual([
      "Spider-Man: Brand New Day",
      "Two seats together",
      "Near 75234",
      "Today",
      "Any time",
      "Any theater",
      "Reference seat",
    ]);
  });

  it("opens the editor each term stands for, and no neighbour's", async () => {
    const opened = jest.fn<(term: Term) => void>();
    await asked({ ...NAMED_FILM, accessibleSeating: true }, opened);

    for (const words of [
      "Spider-Man: Brand New Day",
      "Two seats together",
      "Near 75234",
      "Today",
      "Any time",
      "Any theater",
      "Accessible seating",
      "Reference seat",
    ])
      await fireEvent.press(screen.getByRole("button", { name: words }));

    expect(opened.mock.calls.flat()).toEqual([
      "movie",
      "partySize",
      "area",
      "date",
      "window",
      "narrowing",
      "partySize",
      "profile",
    ]);
  });

  it("gives the film the largest line, and the party and the area a smaller one each, every row with its chevron", async () => {
    await asked();

    expect(sizeOf("Two seats together")).toBeLessThan(
      sizeOf("Spider-Man: Brand New Day"),
    );
    expect(sizeOf("Near 75234")).toBe(sizeOf("Two seats together"));
    expect(screen.getAllByText("›")).toHaveLength(3);
  });

  it("draws the film in its own tone, as the title card does once a film is named", async () => {
    houseLights("down");
    await asked();

    expect(
      StyleSheet.flatten(
        screen.getByText("Spider-Man: Brand New Day").props["style"],
      ).color,
    ).toBe("#f798a4");
  });
});
