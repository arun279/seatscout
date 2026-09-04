import { REFERENCE } from "@seatscout/core";
import { fakeUpstream } from "@seatscout/core/testing";
import { describe, expect, it } from "vitest";
import type { SearchTerms } from "./search.js";
import { createSeatScout, type SeatScoutDependencies } from "./seatscout.js";
import { inMemoryStore } from "./store.js";

const AT = 1000;
const LISTING = "/napi/theaterShowtimeGroupings/245569/2026-08-28";

const TONIGHT: SearchTerms = {
  movie: "245569",
  date: "2026-08-28",
  area: "75006",
  partySize: 2,
  accessibleSeating: false,
};

const composed = (overrides: Partial<SeatScoutDependencies> = {}) => {
  const upstream = fakeUpstream({ seed: 4, standInAuditoriums: true });
  const seatscout = createSeatScout({
    fetch: upstream,
    now: () => AT,
    wait: () => Promise.resolve(),
    random: () => 0.5,
    ...overrides,
  });
  return {
    seatscout,
    listingsRead: () =>
      upstream.requests.filter((request) => request.path.startsWith(LISTING))
        .length,
  };
};

describe("a SeatScout", () => {
  it("searches through the Source it is given and settles with ranked Seat Groups", async () => {
    const { seatscout } = composed();

    const settled = await seatscout.search(TONIGHT).done;

    expect(settled.phase).toBe("settled");
    expect(settled.coverage.candidates).toBe(176);
    expect(settled.results.length).toBeGreaterThan(0);
    expect(settled.results.map((result) => result.score)).toEqual(
      settled.results.map((result) => result.score).toSorted((a, b) => b - a),
    );
  });

  it("holds the listing on the device it was given, so a second search reads the Source once", async () => {
    const { seatscout, listingsRead } = composed();

    await seatscout.search(TONIGHT).done;
    await seatscout.search(TONIGHT).done;

    expect(listingsRead()).toBe(1);
  });

  it("re-verifies a result it found through the same Source", async () => {
    const { seatscout } = composed();
    const settled = await seatscout.search(TONIGHT).done;
    const [best] = settled.results;
    if (best === undefined) throw new Error("the search found nothing");

    const verified = await seatscout.verify(best);

    expect(verified.ok).toBe(true);
  });

  it("remembers the Profile and the searches on the store it is given, so a root opened later over the same store finds them", async () => {
    const store = inMemoryStore();
    const closer = { ...REFERENCE, targetDepth: 0.4 };
    const first = composed({ store }).seatscout;
    await first.profile.remember(closer);
    await first.recent.remember({ ...TONIGHT, partySize: 3 });
    await first.recent.remember(TONIGHT);

    const relaunched = composed({ store }).seatscout;

    expect(await relaunched.profile.remembered()).toEqual(closer);
    expect(await relaunched.recent.remembered()).toEqual([
      { movie: "245569", date: "2026-08-28", area: "75006", partySize: 2 },
      { movie: "245569", date: "2026-08-28", area: "75006", partySize: 3 },
    ]);
  });

  it("remembers nothing across roots that were given no store", async () => {
    await composed().seatscout.profile.remember({
      ...REFERENCE,
      targetDepth: 0.4,
    });

    expect(await composed().seatscout.profile.remembered()).toEqual(REFERENCE);
  });
});
