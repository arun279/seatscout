import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { REFERENCE } from "@seatscout/client";
import type { Term, Terms } from "@seatscout/view-logic";
import {
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react-native";
import { Dimensions } from "react-native";
import { phone, type Upstream } from "../../test/phone.js";
import { NOW, WARM_UP, warmTheCorpus } from "../../test/rooms.js";
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
    readonly onAdjust?: (terms: Terms) => void;
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
      onAdjust={over.onAdjust ?? (() => undefined)}
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

describe("asking for what the query is missing", () => {
  it("offers no Find seats while the query cannot run", async () => {
    await showing();

    expect(screen.queryByRole("button", { name: "Find seats" })).toBeNull();
    expect(screen.queryByTestId("velvet")).toBeNull();
  });

  it("names the area as the next step, and opens Ask at it", async () => {
    const asked = jest.fn<(term: Term) => void>();
    await showing({ onAsk: asked });

    await fireEvent.press(screen.getByRole("button", { name: "Name an area" }));

    expect(asked).toHaveBeenCalledWith("area");
  });

  it("names the film as the next step once the area is named, and opens Ask at it", async () => {
    const asked = jest.fn<(term: Term) => void>();
    await showing({ onAsk: asked, terms: { ...SHORT, area: "75234" } });

    await fireEvent.press(screen.getByRole("button", { name: "Pick a movie" }));

    expect(asked).toHaveBeenCalledWith("movie");
    expect(screen.queryByRole("button", { name: "Name an area" })).toBeNull();
  });

  it("says why beside the next step, and stops asking for an area once one is named", async () => {
    await showing({ terms: { ...SHORT, area: "75234" } });

    expect(
      within(screen.getByTestId("dock")).getByText(
        "Pick a movie playing near 75234.",
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/^Name an area, then/)).toBeNull();
  });

  it("keeps the reason in the dock at ordinary text sizes", async () => {
    await showing();

    expect(
      within(screen.getByTestId("dock")).getByText(/^Name an area, then/),
    ).toBeOnTheScreen();
  });

  it("moves the reason out of the dock at the largest text, so the dock holds only its button", async () => {
    const sized = jest
      .spyOn(Dimensions, "get")
      .mockReturnValue({ fontScale: 3.571, height: 874, scale: 3, width: 402 });
    await showing();
    sized.mockRestore();

    expect(
      within(screen.getByTestId("dock")).queryByText(/^Name an area, then/),
    ).toBeNull();
    expect(screen.getByText(/^Name an area, then/)).toBeOnTheScreen();
  });

  it("opens Ask at the term the pressed token names", async () => {
    const asked = jest.fn<(term: Term) => void>();
    await showing({ onAsk: asked });

    await fireEvent.press(screen.getByRole("button", { name: "Near where?" }));

    expect(asked).toHaveBeenCalledWith("area");
  });

  it("runs the query again with the party chosen in place", async () => {
    const ran = jest.fn<(terms: Terms) => void>();
    await showing({ onAdjust: ran });

    await fireEvent(
      screen.getByTestId("menu Two seats together"),
      "pressAction",
      { nativeEvent: { event: "2" } },
    );

    expect(ran).toHaveBeenCalledWith({ ...SHORT, partySize: 3 });
  });
});
