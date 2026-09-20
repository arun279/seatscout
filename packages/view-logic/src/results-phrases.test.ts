import type { Coverage, SeatGroupResult, Snapshot } from "@seatscout/client";
import { createSeatScout } from "@seatscout/client";
import { fakeUpstream } from "@seatscout/client/testing";
import { describe, expect, it } from "vitest";
import { OFFLINE } from "./phrases.js";
import {
  BELOW_THE_TIE,
  cardNameOf,
  CHANGE_THE_QUERY,
  coverageOf,
  designationsOf,
  emptyOf,
  headOf,
  LEDGER,
  nameOf,
  notAnAnswerAbout,
  notBookableOf,
  ONE_SOURCE,
  partialOf,
  RETRY_THE_SEARCH,
  retryOf,
  roomNameOf,
  talliesOf,
  tiedOf,
  UNREACHED,
  UNREADABLE,
  WAITING_TO_RETRY,
  WIDEN,
} from "./results-phrases.js";
import { ANGELIKA_5, searched } from "./rooms.fixtures.js";

const covering = (candidates: number, checked: number): Coverage => ({
  started: [],
  noSeatMap: [],
  soldOut: [],
  salesOff: [],
  unidentified: [],
  failed: [],
  candidates,
  checked,
});

const reading = (coverage: Coverage, phase: Snapshot["phase"]): Snapshot => ({
  results: [],
  coverage,
  phase,
});

const stonebriarFailed = () =>
  createSeatScout({
    fetch: fakeUpstream({
      seed: 4,
      standInAuditoriums: true,
      sequences: { "/napi/seatMap/558117351": [500, 500, 500] },
    }),
    now: () => 0,
    wait: () => Promise.resolve(),
    random: () => 0.5,
  }).search({
    movie: "245569",
    date: "2026-08-28",
    area: "75006",
    partySize: 2,
    accessibleSeating: false,
  }).done;

const angelika = async (): Promise<SeatGroupResult> => {
  const { settled } = await searched();
  const result = settled.results.find(
    (found) => found.showtime.id === ANGELIKA_5.showtime,
  );
  if (result === undefined) throw new Error("the corpus lost the room");
  return result;
};

describe("the coverage strip", () => {
  it("says what it is doing before it has counted anything, and what it counted once it has", () => {
    expect(coverageOf(reading(covering(0, 0), "resolving"))).toBe(
      "Reading the listing",
    );
    expect(coverageOf(reading(covering(0, 0), "unreachable"))).toBe(
      "Nothing was read",
    );
    expect(coverageOf(reading(covering(176, 84), "searching"))).toBe(
      "176 candidates · 84 checked · 92 to go",
    );
    expect(coverageOf(reading(covering(176, 176), "settled"))).toBe(
      "176 candidates · 176 checked",
    );
  });

  it("names a Showtime the search could not reach by its Theater and the time it starts", async () => {
    const settled = await stonebriarFailed();
    const [unreached] = settled.coverage.failed;
    if (unreached === undefined) throw new Error("no room failed");

    expect(nameOf(unreached)).toBe("AMC Stonebriar 24 · 4:20p");
  });
});

describe("the head of the list", () => {
  it("counts the seat maps still being read while the ranking moves", () => {
    expect(headOf(reading(covering(176, 84), "searching"), false)).toEqual({
      said: "Reading 92 seat maps",
      count: "0 showtimes so far",
    });
  });

  it("says how many rooms answered when some never did, and offers no total", () => {
    expect(headOf(reading(covering(176, 170), "settled"), false)).toEqual({
      said: "From the 170 rooms that answered",
      count: null,
    });
  });

  it("calls the top a tie only when it is one, and totals the list either way", () => {
    const whole = reading(covering(176, 176), "settled");

    expect(headOf(whole, true)).toEqual({
      said: "The top of the list is a tie",
      count: "0 showtimes",
    });
    expect(headOf(whole, false).said).toBe("Best seats first");
  });

  it("says one showtime as one, while the ranking moves and once it has stopped", async () => {
    const one = [await angelika()];
    const whole = reading(covering(176, 176), "settled");

    expect(
      headOf(
        { ...reading(covering(176, 84), "searching"), results: one },
        false,
      ).count,
    ).toBe("1 showtime so far");
    expect(headOf({ ...whole, results: one }, false).count).toBe("1 showtime");
  });

  it("labels the rule of light with how many are tied and what is below it", () => {
    expect(tiedOf(3)).toBe("3 tied");
    expect(BELOW_THE_TIE).toBe("below: measurably further");
  });
});

describe("what a card says", () => {
  it("names its Theater, its time and its Formats, and the room its body opens", async () => {
    const result = await angelika();

    expect(cardNameOf(result)).toBe(ANGELIKA_5.card);
    expect(roomNameOf(result)).toBe(
      `See ${ANGELIKA_5.spoken} in the room at ${ANGELIKA_5.card}`,
    );
  });

  it("counts the Seats of the room that were not bookable, and says nothing where every one was", async () => {
    const result = await angelika();

    expect(
      notBookableOf({
        ...result,
        removed: { ...result.removed, unavailable: 26 },
        seatCount: 239,
      }),
    ).toBe("26 of 239 not bookable");
    expect(
      notBookableOf({
        ...result,
        removed: { ...result.removed, unavailable: 0 },
      }),
    ).toBeNull();
  });

  it("names a Designation on every Seat of a group that carries one, and on none of an ordinary group", async () => {
    const result = await angelika();
    const [first, second] = result.seats;
    if (first === undefined || second === undefined)
      throw new Error("the group is not a pair");

    expect(
      designationsOf({
        ...result,
        seats: [{ ...first, designation: "wheelchair" }, second],
      }),
    ).toBe(`${first.id} wheelchair · ${second.id} standard`);
    expect(designationsOf(result)).toBeNull();
  });
});

describe("the three ways a search can end without a whole list", () => {
  it("says the listing was never read, and what that is not an answer about", () => {
    expect(UNREADABLE).toBe("The listing could not be read.");
    expect(notAnAnswerAbout("tomorrow")).toBe(
      "Nothing was looked at, so this is not an answer about tomorrow.",
    );
  });

  it("counts what answered and what did not, and offers a retry that names its own number", () => {
    const partial = reading(covering(176, 170), "settled");

    expect(partialOf(partial)).toBe(
      "Nothing yet, out of the 170 rooms that answered.",
    );
    expect(talliesOf(partial)).toEqual([
      { figure: 176, word: "candidates", unreached: false },
      { figure: 170, word: "answered", unreached: false },
      { figure: 6, word: "unreached", unreached: true },
    ]);
    expect(retryOf(6)).toBe("Retry the six unreached");
  });

  it("heads a partial search that still found something with the shorter line", async () => {
    const settled = await stonebriarFailed();

    expect(settled.results.length).toBeGreaterThan(0);
    expect(partialOf(settled)).toBe("Not everywhere yet.");
  });

  it("answers a query no room could seat with what it did and what would change it", () => {
    const settled = reading(covering(176, 176), "settled");

    expect(
      emptyOf(
        settled,
        { date: "2026-08-28", area: "75234", partySize: 5 },
        "today",
      ),
    ).toEqual({
      said: "No five seats together, anywhere today.",
      ledes: [
        "Every one of the 176 candidates has an answer, and none of them can seat 5 of you in one unbroken run.",
        "Fewer seats together, another day or a wider area would change it.",
      ],
    });
  });

  it("answers a query nothing was listed for by saying nothing was checked", () => {
    const listed = reading(covering(0, 0), "settled");

    expect(
      emptyOf(
        listed,
        { date: "2026-08-28", area: "75234", partySize: 5 },
        "today",
      ),
    ).toEqual({
      said: "No showtime matches this query today.",
      ledes: [
        "Nothing listed near 75234 carries every term at once, so nothing was checked. Fewer terms would change it.",
      ],
    });
  });
});

describe("the labels a screen reader has to be able to say", () => {
  it("leaves none of them empty", () => {
    const said = [
      BELOW_THE_TIE,
      CHANGE_THE_QUERY,
      LEDGER,
      OFFLINE,
      ONE_SOURCE,
      RETRY_THE_SEARCH,
      UNREACHED,
      UNREADABLE,
      WAITING_TO_RETRY,
      WIDEN,
    ];

    expect(said.filter((label) => label.trim().length === 0)).toEqual([]);
    expect(said).toHaveLength(10);
  });
});
