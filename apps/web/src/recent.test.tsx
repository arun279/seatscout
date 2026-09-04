import "@testing-library/jest-dom/vitest";
import type { RecentSearch } from "@seatscout/client";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FRONT_ROW, staged, TODAY } from "./app.fixtures.js";
import type { Terms } from "./terms.js";

const NOTHING_ASKED: Terms = { date: TODAY, partySize: 2 };

const TONIGHT: RecentSearch = {
  movie: "245569",
  date: TODAY,
  area: "75006",
  partySize: 2,
};

const TOMORROW: RecentSearch = {
  movie: "243819",
  date: "2026-08-29",
  area: "75234",
  partySize: 4,
};

const YESTERDAY: RecentSearch = {
  movie: "246329",
  date: "2026-08-27",
  area: "75006",
  partySize: 1,
};

const again = () =>
  within(screen.getByRole("region", { name: "Run again" })).getAllByRole(
    "button",
  );

describe("recent searches, on the first screen", () => {
  afterEach(cleanup);

  it("offers the searches this device ran, newest first, each as one press", () => {
    const stage = staged({
      terms: NOTHING_ASKED,
      recent: [TOMORROW, TONIGHT],
    });

    expect(again().map((button) => button.textContent)).toEqual([
      "243819Tomorrow · Near 75234 · Four seats together",
      "245569Today · Near 75006 · Two seats together",
    ]);

    fireEvent.click(again()[1] ?? document.body);

    expect(stage.chosen).toEqual([
      { movie: "245569", date: TODAY, area: "75006", partySize: 2 },
    ]);
  });

  it("names each one to assistive technology by what it asked for", () => {
    staged({ terms: NOTHING_ASKED, recent: [TONIGHT] });

    expect(
      screen.getByRole("button", {
        name: "245569, today, near 75006, two seats together",
      }),
    ).toBeVisible();
  });

  it("leaves out a search for a day that has passed, and the whole surface when none is left", () => {
    staged({ terms: NOTHING_ASKED, recent: [YESTERDAY, TONIGHT] });
    expect(again().map((button) => button.textContent)).toEqual([
      "245569Today · Near 75006 · Two seats together",
    ]);
    cleanup();

    staged({ terms: NOTHING_ASKED, recent: [YESTERDAY] });
    expect(screen.queryByRole("region", { name: "Run again" })).toBeNull();
    expect(screen.queryByText("Run again")).toBeNull();
  });

  it("is not on the screen while a search is", async () => {
    const stage = staged({ recent: [TONIGHT, TOMORROW] });
    await stage.settled();

    expect(screen.queryByRole("region", { name: "Run again" })).toBeNull();
  });

  it("says which seat is already set beside the party and the day", () => {
    staged({ terms: NOTHING_ASKED, profile: FRONT_ROW });

    expect(
      screen.getByText(
        "Name a movie and an area to search. Two seats together, today and your custom seat are already set.",
      ),
    ).toBeVisible();
  });
});
