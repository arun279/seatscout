import { describe, expect, it, jest } from "@jest/globals";
import { REFERENCE } from "@seatscout/client";
import type { ProgrammeState, Term, Terms } from "@seatscout/view-logic";
import {
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react-native";
import { StyleSheet } from "react-native";
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

const names = () =>
  within(screen.getByTestId("asked-card"))
    .getAllByRole("button")
    .map((button) => button.props["accessibilityLabel"]);

const sizeOf = (words: string) =>
  Number(StyleSheet.flatten(screen.getByText(words).props["style"]).fontSize);

describe("the card that states a Query once it has been asked", () => {
  it("reads in the order the Search screen asks, the seat with the party and the showing after the film", async () => {
    await asked();

    expect(names()).toEqual([
      "Two seats together",
      "Reference seat",
      "Near 75234",
      "Spider-Man: Brand New Day",
      "Today",
      "Any time",
      "Any showtime",
    ]);
  });

  it("opens the editor each term stands for, and no neighbour's", async () => {
    const opened = jest.fn<(term: Term) => void>();
    await asked({ ...NAMED_FILM, accessibleSeating: true }, opened);

    for (const words of [
      "Two seats together",
      "Accessible seating",
      "Reference seat",
      "Near 75234",
      "Spider-Man: Brand New Day",
      "Today",
      "Any time",
      "Any showtime",
    ])
      await fireEvent.press(screen.getByRole("button", { name: words }));

    expect(opened.mock.calls.flat()).toEqual([
      "partySize",
      "partySize",
      "profile",
      "area",
      "movie",
      "date",
      "window",
      "narrowing",
    ]);
  });

  it("keeps the marquee for the film alone, and states the party and the area in running words", async () => {
    await asked();

    expect(sizeOf("Two seats together")).toBeLessThan(
      sizeOf("Spider-Man: Brand New Day"),
    );
    expect(sizeOf("Near 75234")).toBe(sizeOf("Two seats together"));
    expect(screen.getAllByText("›")).toHaveLength(1);
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
