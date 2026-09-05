import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { REFERENCE } from "@seatscout/client";
import type { ProgrammeState } from "./programme.js";
import { programmeRead, TODAY, TONIGHT } from "./search.fixtures.js";
import { type Terms, termsFrom } from "./terms.js";
import { TitleCard } from "./title-card.js";

const NOTHING_READ: ProgrammeState = {
  phase: "none",
  theaters: [],
  movies: [],
};

let PLAYING: ProgrammeState = NOTHING_READ;

const EVERYTHING = termsFrom(
  "?movie=245569&date=2026-08-28&area=75006&partySize=2&chain=AMC&chain=Landmark&theater=aacbt&theater=aaxju&format=Dolby+Cinema&format=IMAX&amenity=Recliners&from=19:00&until=21:00&accessibleSeating=true",
  TODAY,
);

const card = (
  terms: Terms = TONIGHT,
  programme: ProgrammeState = NOTHING_READ,
) =>
  render(
    <TitleCard
      terms={terms}
      programme={programme}
      profile={REFERENCE}
      today={TODAY}
      onEdit={() => {}}
    />,
  );

const lines = (container: HTMLElement) =>
  [...container.querySelectorAll("h1, p")].map((line) => line.textContent);

describe("the title card", () => {
  beforeAll(async () => {
    PLAYING = await programmeRead();
  });
  afterEach(cleanup);

  it("reads the query back line by line, a middot between terms and never before the first", () => {
    const { container } = card();

    expect(lines(container)).toEqual([
      "Your query · tap any line to change it",
      "Two seats together",
      "245569",
      "Today · Near 75006 · Any showtime · Reference seat",
    ]);
  });

  it("offers every term the query holds to be changed, each its own control", () => {
    card();

    expect(
      screen.getAllByRole("button").map((term) => term.textContent),
    ).toEqual([
      "Two seats together",
      "245569",
      "Today",
      "Near 75006",
      "Any showtime",
      "Reference seat",
    ]);
  });

  it("names the Movie and the Theaters once the programme has been read", () => {
    const { container } = card(TONIGHT, PLAYING);

    expect(lines(container)[2]).toBe("The Dog Stars (2026)");
  });

  it("states every term the query carries, in the order the board draws them", () => {
    const { container } = card(EVERYTHING, PLAYING);

    expect(lines(container)[3]).toBe(
      "Today · 7:00p to 9:00p · Near 75006 · Dolby Cinema or IMAX · Recliners · AMC or Landmark · Cinemark Dallas XD and IMAX or AMC Village on the Parkway 9 · Accessible seating · Reference seat",
    );
  });

  it.each([
    ["from=19:00&until=21:00", "7:00p to 9:00p"],
    ["from=19:00", "from 7:00p"],
    ["until=21:00", "until 9:00p"],
  ])("states the window %s names as %s", (window, words) => {
    const { container } = card(
      termsFrom(`?movie=245569&date=2026-08-28&area=75006&${window}`, TODAY),
      PLAYING,
    );

    expect(lines(container)[3]).toContain(`· ${words} ·`);
  });

  it("gives each value of a term its own control, so a line breaks between two Theaters rather than around both", () => {
    card(EVERYTHING, PLAYING);

    expect(
      screen.getAllByRole("button").map((term) => term.textContent),
    ).toEqual([
      "Two seats together",
      "The Dog Stars (2026)",
      "Today",
      "7:00p to 9:00p",
      "Near 75006",
      "Dolby Cinema",
      "IMAX",
      "Recliners",
      "AMC",
      "Landmark",
      "Cinemark Dallas XD and IMAX",
      "AMC Village on the Parkway 9",
      "Accessible seating",
      "Reference seat",
    ]);
  });
});
