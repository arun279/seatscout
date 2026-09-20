import { REFERENCE } from "@seatscout/client";
import { describe, expect, it, jest } from "@jest/globals";
import type { Term, Terms } from "@seatscout/view-logic";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import {
  everyControlReachesTheTouchFloor,
  everyControlSaysWhatItIs,
} from "../../test/floors.js";
import { phone } from "../../test/phone.js";
import { Search } from "./search.js";

const TODAY = "2026-09-19";

const SHORT: Terms = { date: TODAY, partySize: 2 };

const showing = async (
  over: {
    readonly terms?: Terms;
    readonly remembered?: Parameters<typeof phone>[0];
    readonly onAsk?: (term: Term) => void;
    readonly onRun?: (terms: Terms) => void;
  } = {},
) => {
  const carried = phone(over.remembered);
  await render(
    <Search
      onAsk={over.onAsk ?? (() => undefined)}
      onRun={over.onRun ?? (() => undefined)}
      profile={REFERENCE}
      seatscout={carried.seatscout}
      terms={over.terms ?? SHORT}
      today={TODAY}
    />,
  );
  return carried;
};

describe("the Search screen's prompt face", () => {
  it("announces the party on the title card's first line, and it can be pressed", async () => {
    await showing();

    expect(
      screen.getByRole("button", { name: "Two seats together" }),
    ).toBeOnTheScreen();
  });

  it("asks for the film it has not been given, and that can be pressed too", async () => {
    await showing();

    expect(
      screen.getByRole("button", { name: "Which movie?" }),
    ).toBeOnTheScreen();
  });

  it("sets out the rest of the query one pressable value at a time", async () => {
    await showing();

    for (const words of [
      "Today",
      "Near where?",
      "Any showtime",
      "Reference seat",
    ])
      expect(screen.getByRole("button", { name: words })).toBeOnTheScreen();
  });

  it("says what to name next and what is already set", async () => {
    await showing();

    expect(
      screen.getByText(
        "Name an area, then a movie playing near it. Two seats together, today and the Reference seat are already set.",
      ),
    ).toBeOnTheScreen();
  });

  it("stands the query on the room's own ground", async () => {
    await showing();

    const stage = StyleSheet.flatten(
      screen.getByTestId("stage").props["style"],
    );

    expect(String(stage.backgroundColor)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("reads nothing from the Source, because a query this short cannot be run", async () => {
    const carried = await showing();

    expect(carried.reads).toEqual([]);
  });

  it("names the film in the marquee once the query carries one", async () => {
    await showing({ terms: { ...SHORT, movie: "Spider-Man: Brand New Day" } });

    expect(
      screen.getByRole("button", { name: "Spider-Man: Brand New Day" }),
    ).toBeOnTheScreen();
  });
});

describe("asking for what the query is missing", () => {
  it("opens Ask at the area when the query names none", async () => {
    const asked = jest.fn<(term: Term) => void>();
    await showing({ onAsk: asked });

    await fireEvent.press(screen.getByRole("button", { name: "Find seats" }));

    expect(asked).toHaveBeenCalledWith("area");
  });

  it("opens Ask at the film once the area is named", async () => {
    const asked = jest.fn<(term: Term) => void>();
    await showing({ onAsk: asked, terms: { ...SHORT, area: "75234" } });

    await fireEvent.press(screen.getByRole("button", { name: "Find seats" }));

    expect(asked).toHaveBeenCalledWith("movie");
  });

  it("opens Ask at the term the pressed line names", async () => {
    const asked = jest.fn<(term: Term) => void>();
    await showing({ onAsk: asked });

    await fireEvent.press(screen.getByRole("button", { name: "Today" }));

    expect(asked).toHaveBeenCalledWith("date");
  });

  it("draws one velvet control and no more, whatever its label", async () => {
    await showing();

    expect(screen.getAllByTestId("velvet")).toHaveLength(1);
  });
});

describe("what this phone remembers", () => {
  it("offers a remembered search and runs it again when it is pressed", async () => {
    const ran = jest.fn<(terms: Terms) => void>();
    await showing({
      onRun: ran,
      remembered: [
        {
          movie: "One Battle After Another",
          date: TODAY,
          area: "75201",
          partySize: 4,
        },
      ],
    });

    await fireEvent.press(
      await screen.findByRole("button", {
        name: "One Battle After Another, 4 seats · today · 75201",
      }),
    );

    expect(ran).toHaveBeenCalledWith({
      movie: "One Battle After Another",
      date: TODAY,
      area: "75201",
      partySize: 4,
    });
  });
});

describe("what a thumb can reach", () => {
  it("draws every control at the platform's touch floor or above", async () => {
    await showing();

    everyControlReachesTheTouchFloor();
  });

  it("gives every control a name a screen reader can say", async () => {
    await showing();

    everyControlSaysWhatItIs();
  });
});
