import { describe, expect, it, jest } from "@jest/globals";
import { REFERENCE } from "@seatscout/client";
import type { ProgrammeState, Term, Terms } from "@seatscout/view-logic";
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react-native";
import { selectionAsync } from "expo-haptics";
import { Dimensions, StyleSheet } from "react-native";
import { contrastOf } from "../../test/contrast.js";
import { houseLights } from "../../test/lights.js";
import { themeFor } from "../theme.js";
import { TitleCard } from "./title-card.js";

const TODAY = "2026-09-19";

const NOTHING_READ: ProgrammeState = {
  phase: "none",
  movies: [],
  theaters: [],
};

const SHORT: Terms = { date: TODAY, partySize: 2 };

const card = async (
  terms: Terms,
  over: {
    readonly onEdit?: (term: Term) => void;
    readonly onRun?: (terms: Terms) => void;
  } = {},
) => {
  await render(
    <TitleCard
      onEdit={over.onEdit ?? (() => undefined)}
      onRun={over.onRun ?? (() => undefined)}
      profile={REFERENCE}
      programme={NOTHING_READ}
      terms={terms}
      today={TODAY}
    />,
  );
};

const boxOf = (name: string) =>
  StyleSheet.flatten(screen.getByRole("button", { name }).props["style"]);

const wordsOf = (name: string) =>
  StyleSheet.flatten(screen.getByText(name).props["style"]);

const menuOf = (words: string) => screen.getByTestId(`menu ${words}`);

const picked = (words: string, event: string) =>
  fireEvent(menuOf(words), "pressAction", { nativeEvent: { event } });

describe("the title card's heading", () => {
  it("is a heading that names the Query, with no instruction beside it", async () => {
    await card(SHORT);

    expect(
      screen.getByRole("header", { name: "Your query" }),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/tap any line/i)).toBeNull();
  });
});

describe("a term a person can press", () => {
  it("opens Ask at the term it stands for, and no neighbour's", async () => {
    const asked = jest.fn<(term: Term) => void>();
    await card(SHORT, { onEdit: asked });

    for (const words of [
      "Which movie?",
      "Near where?",
      "Any showtime",
      "Reference seat",
    ])
      await fireEvent.press(screen.getByRole("button", { name: words }));

    expect(asked.mock.calls.flat()).toEqual([
      "movie",
      "area",
      "formats",
      "profile",
    ]);
  });

  it("joins two values of one term with the word the term itself carries", async () => {
    await card({ ...SHORT, formats: ["IMAX", "Dolby Cinema"] });

    expect(screen.getByText("or")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "IMAX" })).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Dolby Cinema" }),
    ).toBeOnTheScreen();
  });
});

describe("a term still to be named", () => {
  it("is an outline with no fill, where a named term is filled", async () => {
    await card({ ...SHORT, area: "75234" });

    expect(boxOf("Which movie?").backgroundColor).toBeUndefined();
    expect(boxOf("Near 75234").backgroundColor).toMatch(/^#[0-9a-f]{6}$/);
    expect(boxOf("Which movie?").borderWidth).toBeGreaterThan(
      Number(boxOf("Near 75234").borderWidth),
    );
  });

  it("draws the area as a blank too, until it is named", async () => {
    await card(SHORT);

    expect(boxOf("Near where?").backgroundColor).toBeUndefined();
    expect(boxOf("Near where?").borderColor).toBe(
      boxOf("Which movie?").borderColor,
    );
  });

  it("lights its words in the colour of its edge", async () => {
    await card(SHORT);

    expect(wordsOf("Which movie?").color).toBe(
      boxOf("Which movie?").borderColor,
    );
    expect(wordsOf("Near where?").color).toBe(boxOf("Near where?").borderColor);
  });
});

describe("the edge of a named term", () => {
  it.each(["down", "up"] as const)(
    "reads at least 3 to 1 against the ground and against its own fill, with the house lights %s",
    async (appearance) => {
      houseLights(appearance);
      await card({ ...SHORT, area: "75234" });
      const { house } = themeFor(appearance).colours;
      const { borderColor, backgroundColor } = boxOf("Near 75234");

      expect(contrastOf(String(borderColor), house)).toBeGreaterThanOrEqual(3);
      expect(
        contrastOf(String(borderColor), String(backgroundColor)),
      ).toBeGreaterThanOrEqual(3);
    },
  );
});

describe("the film the card announces", () => {
  it("draws the film it was given in a tone of its own, not the one that asks for it", async () => {
    await card(SHORT);
    const asking = wordsOf("Which movie?").color;
    await cleanup();

    await card({
      ...SHORT,
      movie: "246329",
      title: "Spider-Man: Brand New Day",
    });
    const named = wordsOf("Spider-Man: Brand New Day").color;

    expect(String(named)).toMatch(/^#[0-9a-f]{6}$/);
    expect(named).not.toBe(asking);
  });
});

describe("the party, changed in place", () => {
  it("is one of two terms that carry the mark of a menu", async () => {
    await card(SHORT);

    expect(screen.getAllByTestId("menu-mark")).toHaveLength(2);
  });

  it("offers one to six seats with the current party on, then a way to Ask", async () => {
    await card(SHORT);

    expect(menuOf("Two seats together").props["actions"]).toEqual([
      { id: "0", title: "One seat", state: "off" },
      { id: "1", title: "Two seats together", state: "on" },
      { id: "2", title: "Three seats together", state: "off" },
      { id: "3", title: "Four seats together", state: "off" },
      { id: "4", title: "Five seats together", state: "off" },
      { id: "5", title: "Six seats together", state: "off" },
      {
        id: "more",
        title: "",
        displayInline: true,
        subactions: [{ id: "more", title: "Another number" }],
      },
    ]);
  });

  it("runs the Query with the party chosen, with a tick under the thumb", async () => {
    const ran = jest.fn<(terms: Terms) => void>();
    await card(SHORT, { onRun: ran });

    await picked("Two seats together", "3");

    expect(ran).toHaveBeenCalledWith({ date: TODAY, partySize: 4 });
    expect(selectionAsync).toHaveBeenCalledTimes(1);
  });

  it("opens Ask at the party for a number the menu does not hold", async () => {
    const asked = jest.fn<(term: Term) => void>();
    const ran = jest.fn<(terms: Terms) => void>();
    await card(SHORT, { onEdit: asked, onRun: ran });

    await picked("Two seats together", "more");

    expect(asked).toHaveBeenCalledWith("partySize");
    expect(ran).not.toHaveBeenCalled();
  });

  it("draws its menu in the appearance of the room", async () => {
    houseLights("up");
    await card(SHORT);

    expect(menuOf("Two seats together").props["colorScheme"]).toBe("light");
    await cleanup();

    houseLights("down");
    await card(SHORT);

    expect(menuOf("Two seats together").props["colorScheme"]).toBe("dark");
  });
});

describe("the day, changed in place", () => {
  it("offers today, tomorrow and any day, then a way to Ask", async () => {
    await card(SHORT);

    expect(menuOf("Today").props["actions"]).toEqual([
      { id: "0", title: "Today", state: "on" },
      { id: "1", title: "Tomorrow", state: "off" },
      { id: "2", title: "Any day in the next 7 days", state: "off" },
      {
        id: "more",
        title: "",
        displayInline: true,
        subactions: [{ id: "more", title: "Pick days or a range" }],
      },
    ]);
  });

  it("runs the Query over any day when that is chosen", async () => {
    const ran = jest.fn<(terms: Terms) => void>();
    await card(SHORT, { onRun: ran });

    await picked("Today", "2");

    expect(ran).toHaveBeenCalledWith({
      date: TODAY,
      when: { kind: "any" },
      partySize: 2,
    });
  });

  it("drops a span of days when one day is chosen", async () => {
    const ran = jest.fn<(terms: Terms) => void>();
    await card(
      { ...SHORT, when: { kind: "range", first: TODAY, last: "2026-09-22" } },
      { onRun: ran },
    );

    await picked("Sat 19 to Tue 22 Sep", "1");

    expect(ran).toHaveBeenCalledWith({ date: "2026-09-20", partySize: 2 });
  });

  it("opens Ask at the day for several days or a range", async () => {
    const asked = jest.fn<(term: Term) => void>();
    await card(SHORT, { onEdit: asked });

    await picked("Today", "more");

    expect(asked).toHaveBeenCalledWith("date");
  });
});

describe("the mark of a menu", () => {
  it.each<[number, readonly number[]]>([
    [1, [15, 14]],
    [3, [30, 42]],
  ])(
    "grows with the reader's text size, %s times, and the marquee's only to its cap",
    async (fontScale, sizes) => {
      const sized = jest
        .spyOn(Dimensions, "get")
        .mockReturnValue({ fontScale, height: 874, scale: 3, width: 402 });
      await card(SHORT);
      sized.mockRestore();

      expect(
        screen.getAllByTestId("menu-mark").map((mark) => mark.props["width"]),
      ).toEqual(sizes);
    },
  );
});
