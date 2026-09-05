import { REFERENCE } from "@seatscout/core";
import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { openRecentSearches } from "./recent.js";
import type { SearchTerms } from "./search.js";
import { inMemoryStore, type RecentSearch } from "./store.js";

const KEY = "seatscout.recent.v1";

const TONIGHT: RecentSearch = {
  movie: "245569",
  date: "2026-08-28",
  area: "75006",
  partySize: 2,
};

const searches: fc.Arbitrary<RecentSearch> = fc.record({
  movie: fc.constantFrom("245569", "243819", "246329"),
  date: fc.constantFrom("2026-08-28", "2026-08-29"),
  area: fc.constantFrom("75006", "75234"),
  partySize: fc.integer({ min: 1, max: 3 }),
});

const lastDistinct = (asked: readonly RecentSearch[], kept: number) =>
  asked
    .toReversed()
    .filter(
      (search, at, all) =>
        all.findIndex(
          (other) => JSON.stringify(other) === JSON.stringify(search),
        ) === at,
    )
    .slice(0, kept);

describe("the searches a device remembers", () => {
  it("remembers none on a device that has run none", async () => {
    expect(await openRecentSearches(inMemoryStore()).remembered()).toEqual([]);
  });

  it("offers the newest first, never the same search twice, and at most five, for any sequence of searches", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(searches, { minLength: 0, maxLength: 12 }),
        async (asked) => {
          const recent = openRecentSearches(inMemoryStore());
          for (const search of asked) await recent.remember(search);

          expect(await recent.remembered()).toEqual(lastDistinct(asked, 5));
        },
      ),
      { numRuns: 200 },
    );
  });

  it("hands back the history as it now stands when a search is remembered", async () => {
    const recent = openRecentSearches(inMemoryStore());
    await recent.remember(TONIGHT);

    expect(await recent.remember({ ...TONIGHT, partySize: 3 })).toEqual([
      { ...TONIGHT, partySize: 3 },
      TONIGHT,
    ]);
  });

  it("keeps the history under a key that names the shape it stores", async () => {
    const store = inMemoryStore();
    await openRecentSearches(store).remember(TONIGHT);

    expect(await store.read(KEY)).toEqual([TONIGHT]);
  });

  it("keeps the four terms that make a search and nothing else it was asked with", async () => {
    const store = inMemoryStore();
    const asked: SearchTerms = {
      ...TONIGHT,
      accessibleSeating: true,
      profile: { ...REFERENCE, targetDepth: 0.4 },
      theaters: [],
    };
    await openRecentSearches(store).remember(asked);

    expect(await store.read(KEY)).toEqual([TONIGHT]);
  });

  it("forgets what the device holds when it was not written by this build, and starts again over it", async () => {
    const held: unknown[] = [
      "245569",
      { ...TONIGHT },
      [TONIGHT, { ...TONIGHT, partySize: "2" }],
      [{ ...TONIGHT, movie: 245569 }],
      [{ ...TONIGHT, date: 20260828 }],
      [{ ...TONIGHT, area: 75006 }],
      [null],
    ];
    const read: unknown[] = [];
    for (const value of held) {
      const store = inMemoryStore();
      const recent = openRecentSearches({
        read: () => Promise.resolve(value),
        write: store.write,
      });
      read.push([await recent.remembered(), await recent.remember(TONIGHT)]);
    }

    expect(read).toEqual(held.map(() => [[], [TONIGHT]]));
  });
});
