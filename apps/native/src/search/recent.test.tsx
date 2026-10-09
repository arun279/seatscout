import { describe, expect, it, jest } from "@jest/globals";
import type { RecentSearch } from "@seatscout/client";
import type { Terms } from "@seatscout/view-logic";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Recent } from "./recent.js";

const TODAY = "2026-09-19";

const ONE: RecentSearch = {
  movie: "245569",
  title: "One Battle After Another",
  dates: [TODAY],
  area: "75201",
  partySize: 4,
};

const ANOTHER: RecentSearch = {
  movie: "246329",
  title: "Spider-Man: Brand New Day",
  dates: ["2026-09-20"],
  area: "75234",
  partySize: 1,
};

const listed = async (
  remembered: readonly RecentSearch[] | undefined,
  onRun: (terms: Terms) => void = () => undefined,
) => {
  await render(<Recent onRun={onRun} remembered={remembered} today={TODAY} />);
};

describe("the searches this phone remembers", () => {
  it("is headed even before the store has answered", async () => {
    await listed(undefined);

    expect(screen.getByText("Run again")).toBeOnTheScreen();
    expect(screen.queryByText(/Nothing yet/)).not.toBeOnTheScreen();
  });

  it("is a heading a screen reader can move to", async () => {
    await listed([ONE]);

    expect(screen.getByRole("header", { name: "Run again" })).toBeOnTheScreen();
  });

  it("says what the app does, above the empty history, until one search has run", async () => {
    await listed([]);

    expect(
      screen.getByText(
        "SeatScout reads the seat maps of showings near you and ranks the seats still free, best row first. It never books and never holds a seat.",
      ),
    ).toBeOnTheScreen();
  });

  it("says no more about itself once a search is remembered, or before the store has answered", async () => {
    await listed([ONE]);

    expect(screen.queryByText(/never holds a seat/)).toBeNull();
    await screen.rerender(
      <Recent onRun={() => undefined} remembered={undefined} today={TODAY} />,
    );

    expect(screen.queryByText(/never holds a seat/)).toBeNull();
  });

  it("says plainly that it remembers none once the store has answered", async () => {
    await listed([]);

    expect(
      screen.getByText(
        "Nothing yet. Searches are kept on this phone once you have run one, and never anywhere else.",
      ),
    ).toBeOnTheScreen();
  });

  it("offers every search it remembers, each named for a screen reader", async () => {
    await listed([ONE, ANOTHER]);

    expect(
      screen.getByRole("button", {
        name: "One Battle After Another, 4 seats · today · 75201",
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", {
        name: "Spider-Man: Brand New Day, 1 seat · tomorrow · 75234",
      }),
    ).toBeOnTheScreen();
  });

  it("runs the search a pressed row stands for", async () => {
    const ran = jest.fn<(terms: Terms) => void>();
    await listed([ONE], ran);

    await fireEvent.press(
      screen.getByRole("button", {
        name: "One Battle After Another, 4 seats · today · 75201",
      }),
    );

    expect(ran).toHaveBeenCalledWith({
      movie: "245569",
      title: "One Battle After Another",
      date: TODAY,
      area: "75201",
      partySize: 4,
    });
  });

  it("names a search kept without a title as your movie, never by the number it is asked by", async () => {
    const untitled = {
      movie: "245569",
      dates: [TODAY],
      area: "75201",
      partySize: 4,
    };
    await listed([untitled]);

    expect(
      screen.getByRole("button", {
        name: "Your movie, 4 seats · today · 75201",
      }),
    ).toBeOnTheScreen();
    expect(screen.getByText("Your movie")).toBeOnTheScreen();
    expect(screen.queryByText(/245569/)).toBeNull();
  });

  it("never offers a search for a date that has passed", async () => {
    await listed([{ ...ONE, dates: ["2026-09-05"] }]);

    expect(
      screen.queryByText("One Battle After Another"),
    ).not.toBeOnTheScreen();
    expect(screen.getByText(/Nothing yet/)).toBeOnTheScreen();
  });
});
