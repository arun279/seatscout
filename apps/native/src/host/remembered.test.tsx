import { describe, expect, it, jest } from "@jest/globals";
import type { KeyValueStore, RecentSearch, SeatScout } from "@seatscout/client";
import { createSeatScout } from "@seatscout/client";
import type { Terms } from "@seatscout/view-logic";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useRemembered, useRememberWhenSettled } from "./remembered.js";

const TODAY = "2026-09-19";

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

    const { result } = await renderHook(() => useRemembered(seatscout));

    expect(result.current).toBeUndefined();
  });

  it("carries what the store answered with", async () => {
    const { seatscout, answer } = held();
    const { result } = await renderHook(() => useRemembered(seatscout));

    answer([KEPT]);

    await waitFor(() => {
      expect(result.current).toEqual([KEPT]);
    });
  });

  it("reads again when the phone hands it a different client", async () => {
    const first = held();
    const second = held();
    const { result, rerender } = await renderHook(
      ({ seatscout }: { seatscout: SeatScout }) => useRemembered(seatscout),
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

  it("reads again once a search is remembered anywhere else in the app", async () => {
    const seatscout = keeping();
    const { result } = await renderHook(() => useRemembered(seatscout));
    await waitFor(() => {
      expect(result.current).toEqual([]);
    });

    await act(() => seatscout.recent.remember(KEPT));

    await waitFor(() => {
      expect(result.current).toEqual([KEPT]);
    });
  });
});

describe("the search a settled query is remembered as", () => {
  it("keeps the query the search settled", async () => {
    const seatscout = keeping();

    await renderHook(() =>
      useRememberWhenSettled(
        seatscout,
        {
          movie: "One Battle After Another",
          date: TODAY,
          area: "75201",
          partySize: 2,
        },
        true,
      ),
    );

    await waitFor(async () => {
      expect(await seatscout.recent.remembered()).toEqual([
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

    await renderHook(() =>
      useRememberWhenSettled(
        seatscout,
        {
          movie: "Sinners",
          date: TODAY,
          when: { kind: "days", dates: [TODAY, "2026-09-21"] },
          area: "75010",
          partySize: 2,
        },
        true,
      ),
    );

    await waitFor(async () => {
      expect(await seatscout.recent.remembered()).toEqual([
        {
          movie: "Sinners",
          dates: [TODAY, "2026-09-21"],
          area: "75010",
          partySize: 2,
        },
      ]);
    });
  });

  it("keeps the title the film was picked by, and keeps it again when only the title changes", async () => {
    const seatscout = keeping();
    const asked: Terms = {
      movie: "246473",
      date: TODAY,
      area: "75010",
      partySize: 2,
    };
    const { rerender } = await renderHook(
      (terms: Terms) => useRememberWhenSettled(seatscout, terms, true),
      { initialProps: asked },
    );
    await waitFor(async () => {
      expect(await seatscout.recent.remembered()).toHaveLength(1);
    });

    await rerender({ ...asked, title: "Sinners" });

    await waitFor(async () => {
      expect(await seatscout.recent.remembered()).toEqual([
        {
          movie: "246473",
          title: "Sinners",
          dates: [TODAY],
          area: "75010",
          partySize: 2,
        },
      ]);
    });
  });

  it("keeps nothing until the search has settled", async () => {
    const seatscout = keeping();
    const remember = jest.spyOn(seatscout.recent, "remember");
    const { rerender } = await renderHook(
      (settled: boolean) =>
        useRememberWhenSettled(
          seatscout,
          { movie: "Sinners", date: TODAY, area: "75010", partySize: 2 },
          settled,
        ),
      { initialProps: false },
    );

    expect(remember).not.toHaveBeenCalled();

    await rerender(true);

    expect(remember).toHaveBeenCalledTimes(1);
  });

  it("keeps nothing while the query still wants a film or an area", async () => {
    const seatscout = keeping();
    const remember = jest.spyOn(seatscout.recent, "remember");
    const { rerender } = await renderHook(
      (terms: Terms) => useRememberWhenSettled(seatscout, terms, true),
      { initialProps: { date: TODAY, area: "75201", partySize: 2 } },
    );

    await rerender({ date: TODAY, movie: "Sinners", partySize: 2 });

    expect(remember).not.toHaveBeenCalled();
  });
});
