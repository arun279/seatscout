import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { REFERENCE } from "@seatscout/client";
import { afterEach, describe, expect, it } from "vitest";
import { TODAY, TONIGHT } from "./search.fixtures.js";
import { TitleCard } from "./title-card.js";

const card = () =>
  render(
    <TitleCard
      terms={TONIGHT}
      profile={REFERENCE}
      today={TODAY}
      onEdit={() => {}}
    />,
  );

describe("the title card", () => {
  afterEach(cleanup);

  it("reads the query back line by line, a middot between terms and never before the first", () => {
    const { container } = card();

    expect(
      [...container.querySelectorAll("h1, p")].map((line) => line.textContent),
    ).toEqual([
      "Your query · tap any line to change it",
      "Two seats together",
      "245569",
      "Today · Near 75006 · Any format · Reference seat",
    ]);
  });

  it("offers the terms the query holds to be changed, and says the rest in plain words", () => {
    card();

    expect(
      screen.getAllByRole("button").map((term) => term.textContent),
    ).toEqual([
      "Two seats together",
      "245569",
      "Today",
      "Near 75006",
      "Reference seat",
    ]);
  });
});
