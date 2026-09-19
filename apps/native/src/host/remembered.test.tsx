import type { KeyValueStore, RecentSearch, SeatScout } from "@seatscout/client";
import { createSeatScout } from "@seatscout/client";
import { describe, expect, it } from "@jest/globals";
import type { Terms } from "@seatscout/view-logic";
import { renderHook, waitFor } from "@testing-library/react-native";
import { useRemembered } from "./remembered.js";

const TODAY = "2026-09-19";

const SHORT: Terms = { date: TODAY, partySize: 2 };

const KEPT: RecentSearch = {
  movie: "One Battle After Another",
  date: "2026-09-19",
  area: "75201",
  partySize: 4,
};

const held = () => {
  let answer: (kept: readonly RecentSearch[]) => void = () => undefined;
  const store: KeyValueStore = {
    read: () =>
      new Promise((settle) => {
        answer = settle;
      }),
    write: () => Promise.resolve(),
  };
  const seatscout: SeatScout = createSeatScout({
    fetch: () => Promise.reject(new Error("nothing is read here")),
    now: () => 0,
    wait: () => Promise.resolve(),
    random: () => 0,
    store,
  });
  return { seatscout, answer: (kept: readonly RecentSearch[]) => answer(kept) };
};

const keeping = () => {
  const kept = new Map<string, unknown>();
  const store: KeyValueStore = {
    read: (key) => Promise.resolve(kept.get(key)),
    write: (key, value) => {
      kept.set(key, value);
      return Promise.resolve();
    },
  };
  return createSeatScout({
    fetch: () => Promise.reject(new Error("nothing is read here")),
    now: () => 0,
    wait: () => Promise.resolve(),
    random: () => 0,
    store,
  });
};

describe("what this phone remembers", () => {
  it("says nothing at all until the store has answered", async () => {
    const { seatscout } = held();

    const { result } = await renderHook(() => useRemembered(seatscout, SHORT));

    expect(result.current).toBeUndefined();
  });

  it("carries what the store answered with", async () => {
    const { seatscout, answer } = held();
    const { result } = await renderHook(() => useRemembered(seatscout, SHORT));

    answer([KEPT]);

    await waitFor(() => {
      expect(result.current).toEqual([KEPT]);
    });
  });

  it("reads again when the phone hands it a different client", async () => {
    const first = held();
    const second = held();
    const { result, rerender } = await renderHook(
      ({ seatscout }: { seatscout: SeatScout }) =>
        useRemembered(seatscout, SHORT),
      { initialProps: { seatscout: first.seatscout } },
    );
    first.answer([KEPT]);
    await waitFor(() => {
      expect(result.current).toEqual([KEPT]);
    });

    await rerender({ seatscout: second.seatscout });
    second.answer([]);

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });
});

describe("the search a complete query is remembered as", () => {
  it("keeps the query the phone is showing, and offers it back at the head", async () => {
    const seatscout = keeping();
    const { result } = await renderHook(() =>
      useRemembered(seatscout, {
        ...SHORT,
        movie: KEPT.movie,
        area: KEPT.area,
      }),
    );

    await waitFor(() => {
      expect(result.current).toEqual([{ ...KEPT, partySize: 2 }]);
    });
  });

  it("keeps a query the phone is shown next beside the one before it", async () => {
    const seatscout = keeping();
    const { result, rerender } = await renderHook(
      ({ terms }: { terms: Terms }) => useRemembered(seatscout, terms),
      {
        initialProps: {
          terms: { ...SHORT, movie: KEPT.movie, area: KEPT.area },
        },
      },
    );
    await waitFor(() => {
      expect(result.current).toHaveLength(1);
    });

    await rerender({ terms: { ...SHORT, movie: "Sinners", area: "75010" } });

    await waitFor(() => {
      expect(result.current).toEqual([
        { movie: "Sinners", date: TODAY, area: "75010", partySize: 2 },
        { ...KEPT, partySize: 2 },
      ]);
    });
  });

  it("keeps nothing while the query still wants a film", async () => {
    const seatscout = keeping();
    const { result } = await renderHook(() =>
      useRemembered(seatscout, { ...SHORT, area: KEPT.area }),
    );

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });

  it("keeps nothing while the query still wants an area", async () => {
    const seatscout = keeping();
    const { result } = await renderHook(() =>
      useRemembered(seatscout, { ...SHORT, movie: KEPT.movie }),
    );

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });
});
