import type { KeyValueStore, RecentSearch, SeatScout } from "@seatscout/client";
import { createSeatScout } from "@seatscout/client";
import { describe, expect, it } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react-native";
import { useRemembered } from "./remembered.js";

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
});
