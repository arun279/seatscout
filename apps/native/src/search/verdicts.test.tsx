import type { SearchTerms, Snapshot } from "@seatscout/client";
import { describe, expect, it, jest } from "@jest/globals";
import type { Term, Terms } from "@seatscout/view-logic";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { settled, TODAY } from "../../test/rooms.js";
import { Empty, Partial, Unreachable } from "./verdicts.js";

const FAILING = { "/napi/seatMap/558117351": [500, 500, 500] };

const WHOLE_LISTING: SearchTerms = {
  movie: "245569",
  dates: [TODAY],
  area: "75006",
  partySize: 2,
  accessibleSeating: false,
};

const nothing = () => undefined;

const partial = (): Promise<Snapshot> =>
  settled(WHOLE_LISTING, { sequences: FAILING });

describe("the listing that could not be read", () => {
  it("says nothing was looked at, so it is not an answer about the day asked for", async () => {
    await render(
      <Unreachable onEdit={nothing} online onRetry={nothing} when="tomorrow" />,
    );

    expect(screen.getByRole("header")).toHaveTextContent(
      "The listing could not be read.",
    );
    expect(
      screen.getByText(
        "Nothing was looked at, so this is not an answer about tomorrow.",
      ),
    ).toBeOnTheScreen();
  });

  it("offers the retry in velvet, because the whole search is what it would re-run", async () => {
    const again = jest.fn<() => void>();
    await render(
      <Unreachable onEdit={nothing} online onRetry={again} when="today" />,
    );

    await fireEvent.press(
      screen.getByRole("button", { name: "Retry the search" }),
    );

    expect(again).toHaveBeenCalledTimes(1);
    expect(screen.getAllByTestId("velvet")).toHaveLength(1);
  });

  it("draws no retry at all offline, and names what it is waiting for instead", async () => {
    await render(
      <Unreachable
        onEdit={nothing}
        online={false}
        onRetry={nothing}
        when="today"
      />,
    );

    expect(screen.queryAllByTestId("velvet")).toEqual([]);
    expect(
      screen.getByText("Waiting for a connection to retry"),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: /Waiting for a connection/ }),
    ).toBeNull();
  });

  it("offers to widen the query instead, whatever the connection", async () => {
    const asked = jest.fn<(term: Term) => void>();
    await render(
      <Unreachable
        onEdit={asked}
        online={false}
        onRetry={nothing}
        when="today"
      />,
    );

    await fireEvent.press(
      screen.getByRole("button", { name: "Widen instead: change the query" }),
    );

    expect(asked).toHaveBeenCalledWith("movie");
  });
});

describe("the search that did not reach everywhere", () => {
  it("counts what answered and what did not before it offers the list", async () => {
    const snapshot = await partial();
    await render(
      <Partial onEdit={nothing} online onRetry={nothing} snapshot={snapshot} />,
    );

    expect(screen.getByText("Not everywhere yet.")).toBeOnTheScreen();
    for (const word of ["candidates", "answered", "unreached"])
      expect(screen.getByText(word)).toBeOnTheScreen();
    expect(screen.getByText("Could not be reached")).toBeOnTheScreen();
  });

  it("names every Showtime it could not reach, with its Theater and time", async () => {
    const snapshot = await partial();
    await render(
      <Partial onEdit={nothing} online onRetry={nothing} snapshot={snapshot} />,
    );

    expect(snapshot.coverage.failed.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^.+ · \d{1,2}:\d{2}[ap]$/)).toHaveLength(
      snapshot.coverage.failed.length,
    );
  });

  it("offers a retry that names its own number, and re-reads only what failed", async () => {
    const again = jest.fn<() => void>();
    const snapshot = await partial();
    await render(
      <Partial onEdit={nothing} online onRetry={again} snapshot={snapshot} />,
    );

    await fireEvent.press(
      screen.getByRole("button", { name: "Retry the one unreached" }),
    );

    expect(snapshot.coverage.failed).toHaveLength(1);
    expect(again).toHaveBeenCalledTimes(1);
  });
});

describe("the search that found nothing", () => {
  const FIVE: Terms = { date: TODAY, area: "75234", partySize: 5 };

  const whole = (candidates: number): Snapshot => ({
    results: [],
    phase: "settled",
    days: [],
    refused: false,
    coverage: {
      started: [],
      noSeatMap: [],
      soldOut: [],
      salesOff: [],
      unidentified: [],
      failed: [],
      candidates,
      checked: candidates,
    },
  });

  it("says no room could seat the party, and the three things that would change it", async () => {
    await render(
      <Empty
        onEdit={nothing}
        snapshot={whole(176)}
        terms={FIVE}
        when="today"
      />,
    );

    expect(
      screen.getByText("No five seats together, anywhere today."),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Fewer seats together, another day or a wider area would change it.",
      ),
    ).toBeOnTheScreen();
  });

  it("offers the one control that can work, and it is the velvet one", async () => {
    const asked = jest.fn<(term: Term) => void>();
    await render(
      <Empty onEdit={asked} snapshot={whole(176)} terms={FIVE} when="today" />,
    );

    await fireEvent.press(
      screen.getByRole("button", { name: "Change the query" }),
    );

    expect(asked).toHaveBeenCalledWith("partySize");
    expect(screen.getAllByTestId("velvet")).toHaveLength(1);
  });

  it("says instead that nothing was listed when no candidate matched at all", async () => {
    const asked = jest.fn<(term: Term) => void>();
    await render(
      <Empty onEdit={asked} snapshot={whole(0)} terms={FIVE} when="today" />,
    );

    expect(
      screen.getByText("No showtime matches this query today."),
    ).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole("button", { name: "Change the query" }),
    );

    expect(asked).toHaveBeenCalledWith("formats");
  });
});
