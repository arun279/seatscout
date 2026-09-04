import {
  type Coverage,
  createSeatScout,
  type SeatGroupResult,
} from "@seatscout/client";
import { fakeUpstream } from "@seatscout/client/testing";
import { describe, expect, it } from "vitest";
import { accountOf, listed, tiedIn, unreachedIn } from "./derived.js";

const searched = () =>
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

const repeated = <Item>(item: Item, times: number): readonly Item[] =>
  Array.from({ length: times }, () => item);

const at = (
  result: SeatGroupResult,
  startsAt: string,
  tied: boolean,
): SeatGroupResult => ({
  ...result,
  showtime: { ...result.showtime, startsAt },
  reasons: { ...result.reasons, tiedAtRoomResolution: tied },
});

describe("what the screen derives from a snapshot", () => {
  it("accounts for candidates as checked, as named by outcome, and as the remainder still to come", async () => {
    const settled = await searched();
    const [showtime] = settled.coverage.failed;
    if (showtime === undefined) throw new Error("no room failed");
    const { id: _, ...unidentified } = showtime;
    const coverage: Coverage = {
      candidates: 40,
      checked: 10,
      started: repeated(showtime, 1),
      noSeatMap: repeated(showtime, 2),
      soldOut: repeated(showtime, 3),
      salesOff: repeated(showtime, 4),
      unidentified: repeated(unidentified, 5),
      failed: repeated(showtime, 6),
    };

    expect(accountOf(coverage)).toEqual({
      candidates: 40,
      checked: 10,
      remaining: 9,
    });
    expect(unreachedIn({ ...settled, coverage })).toBe(15);
  });

  it("lists the results at the room's resolution first, soonest first and the lower Showtime first at one time, then the rest as ranked", async () => {
    const settled = await searched();
    const [first, second, third] = settled.results;
    if (first === undefined || second === undefined || third === undefined)
      throw new Error("the search found fewer than three results");
    const [lower, higher] = [second, third].toSorted(
      (left, right) => left.showtime.id - right.showtime.id,
    );
    if (lower === undefined || higher === undefined)
      throw new Error("two results went missing");
    const later = at(first, "2026-08-28T20:00:00-05:00", true);
    const sixHigher = at(higher, "2026-08-28T18:00:00-05:00", true);
    const sixLower = at(lower, "2026-08-28T18:00:00-05:00", true);
    const ranked = at(first, "2026-08-28T10:00:00-05:00", false);
    const results = [ranked, later, sixHigher, sixLower];

    expect(tiedIn(results)).toBe(3);
    expect(listed(results).map((result) => result.showtime.id)).toEqual([
      lower.showtime.id,
      higher.showtime.id,
      first.showtime.id,
      first.showtime.id,
    ]);
  });
});
