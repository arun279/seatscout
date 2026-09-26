import { REFERENCE } from "@seatscout/client";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import type { Term, Terms } from "@seatscout/view-logic";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { phone, type Upstream } from "../../test/phone.js";
import {
  NOW,
  TODAY,
  TONIGHT,
  WARM_UP,
  warmTheCorpus,
} from "../../test/rooms.js";
import type { Clock } from "../host/clock.js";
import { Search } from "./search.js";

const PROMPT_DAY = "2026-09-19";

const SHORT: Terms = { date: PROMPT_DAY, partySize: 2 };

const STILL: Clock = { now: () => NOW, subscribe: () => () => undefined };

beforeAll(warmTheCorpus, WARM_UP);

const showing = async (
  over: {
    readonly terms?: Terms;
    readonly today?: string;
    readonly online?: boolean;
    readonly upstream?: Upstream;
    readonly remembered?: Parameters<typeof phone>[0];
    readonly onAsk?: (term: Term) => void;
    readonly onRun?: (terms: Terms) => void;
  } = {},
) => {
  const carried = phone(over.remembered, over.upstream ?? {});
  await render(
    <Search
      clock={STILL}
      onAsk={over.onAsk ?? (() => undefined)}
      onHandOff={() => undefined}
      onLedger={() => undefined}
      online={over.online ?? true}
      onRoom={() => undefined}
      onRun={over.onRun ?? (() => undefined)}
      profile={REFERENCE}
      seatscout={carried.seatscout}
      terms={over.terms ?? SHORT}
      today={over.today ?? PROMPT_DAY}
    />,
  );
  return carried;
};

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

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
          date: PROMPT_DAY,
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
      date: PROMPT_DAY,
      area: "75201",
      partySize: 4,
    });
  });
});

describe("the face the Search screen wears", () => {
  it("prompts for what is missing while the query cannot be run", async () => {
    await showing();

    expect(
      screen.getByRole("button", { name: "Find seats" }),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId("list")).toBeNull();
  });

  it("ranks Seat Groups instead once the query carries a film and an area", async () => {
    await showing({
      upstream: { script: {} },
      terms: { ...TONIGHT, until: "19:20" },
      today: TODAY,
    });

    expect(await screen.findByText("Best seats first")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Find seats" })).toBeNull();
  });
});

describe("a query that spans more than one day", () => {
  it("searches the nearest day alone, and says the days after it are not read yet", async () => {
    const { reads } = await showing({
      upstream: { script: {} },
      terms: {
        ...TONIGHT,
        until: "19:20",
        when: { kind: "range", first: TODAY, last: "2026-08-31" },
      },
      today: TODAY,
    });

    expect(await screen.findByText("Best seats first")).toBeOnTheScreen();
    expect(
      screen.getByText("Sat 29 to Mon 31 Aug not read yet"),
    ).toBeOnTheScreen();
    expect(reads.some((url) => url.includes(TODAY))).toBe(true);
    expect(reads.filter((url) => /2026-08-(29|30|31)/.test(url))).toEqual([]);
  });

  it("says nothing is left unread when the query holds one day", async () => {
    await showing({
      upstream: { script: {} },
      terms: { ...TONIGHT, until: "19:20" },
      today: TODAY,
    });

    expect(await screen.findByText("Best seats first")).toBeOnTheScreen();
    expect(screen.queryByText(/not read yet/)).toBeNull();
  });
});

describe("what the screen says when the phone is offline", () => {
  it("says seats are never cached, once, wherever the query has got to", async () => {
    await showing({ online: false });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Offline. Seats are never cached, so nothing here is refreshed until the connection returns.",
    );
  });

  it("says nothing of the kind on a connection", async () => {
    await showing();

    expect(screen.queryByRole("status")).toBeNull();
  });
});
