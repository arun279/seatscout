import { createSeatScout } from "@seatscout/client";
import type { KeyValueStore, RecentSearch, SeatScout } from "@seatscout/client";
import { describe, expect, it } from "@jest/globals";
import type { Terms } from "@seatscout/view-logic";
import { renderHook, waitFor } from "@testing-library/react-native";
import { useRemembered } from "./remembered.js";

const TODAY = "2026-09-19";

const SHORT: Terms = { date: TODAY, partySize: 2 };

const KEPT: RecentSearch = {
  movie: "One Battle After Another",
  dates: ["2026-09-19"],
  area: "75201",
  partySize: 4,
};

const HOST = {
  fetch: () => Promise.reject(new Error("nothing is read here")),
  now: () => 0,
  wait: () => Promise.resolve(),
  random: () => 0,
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
  return {
    seatscout: createSeatScout({ ...HOST, store }),
    answer: (kept: readonly RecentSearch[]) => answer(kept),
  };
};

const keeping = (): SeatScout => createSeatScout(HOST);

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
  it("keeps the query the phone is showing, and offers it back", async () => {
    const seatscout = keeping();

    const { result } = await renderHook(() =>
      useRemembered(seatscout, {
        movie: "One Battle After Another",
        date: TODAY,
        area: "75201",
        partySize: 2,
      }),
    );

    await waitFor(() => {
      expect(result.current).toEqual([
        {
          movie: "One Battle After Another",
          dates: [TODAY],
          area: "75201",
          partySize: 2,
        },
      ]);
    });
  });

  it("keeps a query the phone is shown next at the head of the one before it", async () => {
    const seatscout = keeping();
    const { result, rerender } = await renderHook(
      ({ terms }: { terms: Terms }) => useRemembered(seatscout, terms),
      {
        initialProps: {
          terms: {
            movie: "One Battle After Another",
            date: TODAY,
            area: "75201",
            partySize: 2,
          },
        },
      },
    );
    await waitFor(() => {
      expect(result.current).toHaveLength(1);
    });

    await rerender({
      terms: { movie: "Sinners", date: TODAY, area: "75010", partySize: 2 },
    });

    await waitFor(() => {
      expect(result.current).toEqual([
        { movie: "Sinners", dates: [TODAY], area: "75010", partySize: 2 },
        {
          movie: "One Battle After Another",
          dates: [TODAY],
          area: "75201",
          partySize: 2,
        },
      ]);
    });
  });

  it("keeps every day a query spans, as the address writes them", async () => {
    const seatscout = keeping();

    const { result } = await renderHook(() =>
      useRemembered(seatscout, {
        movie: "Sinners",
        date: TODAY,
        when: { kind: "days", dates: [TODAY, "2026-09-21"] },
        area: "75010",
        partySize: 2,
      }),
    );

    await waitFor(() => {
      expect(result.current).toEqual([
        {
          movie: "Sinners",
          dates: [TODAY, "2026-09-21"],
          area: "75010",
          partySize: 2,
        },
      ]);
    });
  });

  it("keeps nothing while the query still wants a film", async () => {
    const seatscout = keeping();

    const { result } = await renderHook(() =>
      useRemembered(seatscout, { date: TODAY, area: "75201", partySize: 2 }),
    );

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });

  it("keeps nothing while the query still wants an area", async () => {
    const seatscout = keeping();

    const { result } = await renderHook(() =>
      useRemembered(seatscout, {
        date: TODAY,
        movie: "One Battle After Another",
        partySize: 2,
      }),
    );

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });
});
