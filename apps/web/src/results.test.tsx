import "@testing-library/jest-dom/vitest";
import type { SeatGroupResult, Snapshot } from "@seatscout/client";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, expectTypeOf, it } from "vitest";
import {
  before,
  cards,
  failing,
  settledAlone,
  staged,
  TODAY,
  TONIGHT,
} from "./search.fixtures.js";
import type { HeldSnapshots } from "./held.js";
import { clockOf } from "./phrases.js";
import { Results } from "./results.js";

const nameOf = ({ showtime }: SeatGroupResult) =>
  [
    showtime.presentation.theater.name,
    clockOf(showtime.startsAt),
    ...showtime.presentation.formats,
  ]
    .join(", ")
    .replace(/\s+/g, " ");

const cardOf = (result: SeatGroupResult) =>
  screen.getByRole("article", { name: nameOf(result) });

const minutesOf = (clock: string) => {
  const [, hour, minute, half] = /^(\d+):(\d+)([ap])$/.exec(clock) ?? [];
  return ((Number(hour) % 12) + (half === "p" ? 12 : 0)) * 60 + Number(minute);
};

const listing = (snapshot: Snapshot) => {
  const held: HeldSnapshots = {
    snapshot: () => snapshot,
    subscribe: () => () => {},
    hold: () => {},
    release: () => {},
  };
  render(
    <Results
      snapshot={snapshot}
      terms={TONIGHT}
      today={TODAY}
      now={0}
      held={held}
      onRetry={() => {}}
      onEdit={() => {}}
    />,
  );
};

describe("the list on the first screen", () => {
  afterEach(cleanup);

  it("keeps the list off the screen while the ranking is still moving, and the counts on it", async () => {
    const stage = staged({
      script: { sequences: failing([500]) },
      holdRetries: true,
    });
    await act(() => Promise.resolve());
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "176 candidates · 170 checked · 2 to go",
      ),
    );

    expect(cards()).toEqual([]);
    expect(screen.getByText("Reading 2 seat maps")).toBeVisible();
    expect(screen.getByText(/^\d+ showtimes so far$/)).toBeVisible();

    await stage.resumeRetries();
    await stage.settled();

    expect(cards().length).toBeGreaterThan(0);
    expect(screen.getByRole("status")).toHaveTextContent(
      /^176 candidates · 172 checked$/,
    );
  });

  it("shows Seat Groups best-first once the ranking has stopped moving, each card named for its Theater and time and saying where, why, how fresh and from how many Sources", async () => {
    const stage = staged();
    const settled = await stage.settled();

    expect(cards()).toHaveLength(settled.results.length);
    const head = screen.getByRole("heading", { level: 2 });
    expect(head).toHaveTextContent("The top of the list is a tie");
    expect(head).toHaveTextContent(`${settled.results.length} showtimes`);
    expect(head).not.toHaveTextContent("so far");
    for (const result of [settled.results[0], settled.results.at(-1)]) {
      if (result === undefined) throw new Error("the search found nothing");
      expect(cardOf(result)).toBeVisible();
    }

    const first = within(cards()[0] ?? document.body);
    expect(first.getByText(/^Row \d+ of \d+ · /)).toBeVisible();
    expect(first.getByText(/^\d{1,2}:\d{2}[ap]$/)).toBeVisible();
    expect(first.getByText(/^[A-Z]+\d+·[A-Z]+\d+$/)).toBeVisible();
    expect(first.getByText("1 source")).toBeVisible();
    expect(first.getByText("0s")).toBeVisible();

    const tied = settled.results.filter(
      (result) => result.reasons.tiedAtRoomResolution,
    );
    expect(tied.length).toBeGreaterThan(1);
    const rule = screen.getByText(
      `${tied.length} tied · below: measurably further`,
    );
    const above = cards().filter((card) => before(card, rule));
    expect(above).toHaveLength(tied.length);
    const minutes = above.map((card) =>
      minutesOf(
        within(card).getByText(/^\d{1,2}:\d{2}[ap]$/).textContent ?? "",
      ),
    );
    expect(minutes).toEqual(minutes.toSorted((a, b) => a - b));
  });

  it("counts one Source because Provenance names one, so the card's word stays singular until that changes", () => {
    expectTypeOf<
      SeatGroupResult["seats"][number]["provenance"]["source"]
    >().toEqualTypeOf<"aggregator">();
  });

  it("marks each card with the room's formats, its plan, and how many of its seats were not bookable", async () => {
    const stage = staged();
    const settled = await stage.settled();
    const chipped = settled.results.find(
      (result) => result.showtime.presentation.formats.length > 0,
    );
    const partlySold = settled.results.find(
      (result) => result.removed.unavailable > 0,
    );
    if (chipped === undefined || partlySold === undefined)
      throw new Error("the corpus lost its formats or its sold seats");

    for (const format of chipped.showtime.presentation.formats)
      expect(within(cardOf(chipped)).getByText(format)).toBeVisible();
    expect(cardOf(partlySold)).toHaveTextContent(
      `${clockOf(partlySold.showtime.startsAt)} · Row`,
    );
    expect(cardOf(partlySold)).toHaveTextContent(
      `· ${partlySold.removed.unavailable} of ${partlySold.seatCount} not bookable`,
    );
    for (const result of [chipped, partlySold])
      expect(cardOf(result).querySelectorAll("line")).toHaveLength(
        result.plan.reduce((lines, row) => lines + row.runs.length, 1),
      );
  });

  it("says nothing about seats not bookable on a card whose room had every seat to offer", async () => {
    const settled = await settledAlone();
    const [first] = settled.results;
    if (first === undefined) throw new Error("no result to redraw");
    listing({
      ...settled,
      results: [{ ...first, removed: { ...first.removed, unavailable: 0 } }],
    });

    expect(screen.getByRole("article")).not.toHaveTextContent("not bookable");
  });

  it.each([1, 0])(
    "calls the top a tie only when more than one result sits at the room's resolution, not %i",
    async (atTarget) => {
      const settled = await settledAlone();
      const results = settled.results.map((result, at) => ({
        ...result,
        reasons: { ...result.reasons, tiedAtRoomResolution: at < atTarget },
      }));
      listing({ ...settled, results });

      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
        "Best seats first",
      );
      expect(screen.queryByText(/measurably further/)).toBeNull();
      expect(cards()).toHaveLength(results.length);
    },
  );

  it("counts freshness up as the clock moves", async () => {
    const stage = staged();
    await stage.settled();

    act(() => stage.advance(8_000));

    expect(within(cards()[0] ?? document.body).getByText("8s")).toBeVisible();
  });

  it.each(["pointerUp", "pointerCancel", "pointerLeave"] as const)(
    "holds the list still while a pointer is down on it, and lets it move on %s",
    async (release) => {
      const stage = staged();
      const list = screen.getByRole("list");
      fireEvent.pointerDown(list);
      await stage.settled();

      expect(cards()).toEqual([]);

      fireEvent[release](list);
      await waitFor(() => expect(cards().length).toBeGreaterThan(0));
    },
  );
});
