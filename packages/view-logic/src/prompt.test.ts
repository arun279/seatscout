import { describe, expect, it } from "vitest";
import {
  ANOTHER_NUMBER,
  DONE,
  NEXT_STEP,
  PICK_DAYS,
  ROOM_DRAWS_HERE,
  RUN_AGAIN,
  WHAT_IT_DOES,
  YOUR_QUERY,
} from "./phrases.js";
import { daysOf, nextOf, partiesOf } from "./prompt.js";

const TODAY = "2026-10-09";

describe("what a Query asks for next", () => {
  it("asks for the area first, since the films on offer depend on it", () => {
    expect(nextOf({})).toBe("area");
  });

  it("asks for the movie once the area is named", () => {
    expect(nextOf({ area: "75234" })).toBe("movie");
  });
});

describe("the party a menu offers in place", () => {
  it("offers one to six seats in the card's own words, the current party marked", () => {
    expect(partiesOf(2)).toEqual([
      { value: 1, text: "One seat", chosen: false },
      { value: 2, text: "Two seats together", chosen: true },
      { value: 3, text: "Three seats together", chosen: false },
      { value: 4, text: "Four seats together", chosen: false },
      { value: 5, text: "Five seats together", chosen: false },
      { value: 6, text: "Six seats together", chosen: false },
    ]);
  });

  it("marks none when the party is larger than the menu holds", () => {
    expect(partiesOf(9).filter(({ chosen }) => chosen)).toEqual([]);
  });
});

describe("the days a menu offers in place", () => {
  it("offers today, tomorrow and any day ahead, in the words the card uses", () => {
    expect(daysOf({ date: TODAY }, TODAY)).toEqual([
      { value: { date: TODAY }, text: "Today", chosen: true },
      { value: { date: "2026-10-10" }, text: "Tomorrow", chosen: false },
      {
        value: { date: TODAY, when: { kind: "any" } },
        text: "Any day in the next 7 days",
        chosen: false,
      },
    ]);
  });

  it("marks tomorrow when the Query asks about tomorrow", () => {
    expect(
      daysOf({ date: "2026-10-10" }, TODAY).map(({ chosen }) => chosen),
    ).toEqual([false, true, false]);
  });

  it("marks any day when the Query asks about any day", () => {
    expect(
      daysOf({ date: TODAY, when: { kind: "any" } }, TODAY).map(
        ({ chosen }) => chosen,
      ),
    ).toEqual([false, false, true]);
  });

  it("marks none for days picked or a range, which only Ask can show", () => {
    for (const when of [
      { kind: "days", dates: [TODAY, "2026-10-11"] },
      { kind: "range", first: TODAY, last: "2026-10-12" },
    ] as const)
      expect(
        daysOf({ date: TODAY, when }, TODAY).some(({ chosen }) => chosen),
      ).toBe(false);
  });
});

describe("the words the prompt face adds", () => {
  it("says each in plain words, as approved", () => {
    expect([
      YOUR_QUERY,
      NEXT_STEP.area,
      NEXT_STEP.movie,
      ANOTHER_NUMBER,
      DONE,
      PICK_DAYS,
      ROOM_DRAWS_HERE,
      RUN_AGAIN,
      WHAT_IT_DOES,
    ]).toEqual([
      "Your query",
      "Name an area",
      "Pick a movie",
      "Another number",
      "Done",
      "Pick days or a range",
      "Open a showtime and its room draws here.",
      "Run again",
      "SeatScout reads the seat maps of showings near you and ranks the seats still free, best row first. It never books and never holds a seat.",
    ]);
  });
});
