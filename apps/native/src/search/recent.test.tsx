import { describe, expect, it, jest } from "@jest/globals";
import type { RecentSearch } from "@seatscout/client";
import type { Terms } from "@seatscout/view-logic";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
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

const ruleUnder = (movie: string) =>
  Number(
    StyleSheet.flatten(
      screen.getByRole("button", { name: new RegExp(movie) }).props["style"],
    ).borderBottomWidth,
  );

describe("the searches this phone remembers", () => {
  it("rules between the rows and not under the last, which has nothing below it", async () => {
    await listed([ONE, ANOTHER]);

    expect(ruleUnder("One Battle")).toBeGreaterThan(0);
    expect(ruleUnder("Spider-Man")).toBe(0);
  });

  it("points each row onward with a 16 point chevron", async () => {
    await listed([ONE]);

    expect(
      StyleSheet.flatten(screen.getByText("›").props["style"]).fontSize,
    ).toBe(16);
  });

  it("is headed even before the store has answered", async () => {
    await listed(undefined);

    expect(screen.getByText("Run again")).toBeOnTheScreen();
    expect(screen.queryByText(/Nothing yet/)).not.toBeOnTheScreen();
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

  it("rules one row off from the next with a hairline", async () => {
    await listed([ONE]);

    const row = StyleSheet.flatten(
      screen.getByRole("button", {
        name: "One Battle After Another, 4 seats · today · 75201",
      }).props["style"],
    );

    expect(String(row.borderBottomColor)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("never offers a search for a date that has passed", async () => {
    await listed([{ ...ONE, dates: ["2026-09-05"] }]);

    expect(
      screen.queryByText("One Battle After Another"),
    ).not.toBeOnTheScreen();
    expect(screen.getByText(/Nothing yet/)).toBeOnTheScreen();
  });
});
