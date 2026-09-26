import { describe, expect, it } from "@jest/globals";
import {
  createSeatScout,
  type KeyValueStore,
  REFERENCE,
  type SeatProfile,
} from "@seatscout/client";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { heldProfile, useProfile } from "./profile.js";

const FRONT_ROW: SeatProfile = { ...REFERENCE, targetDepth: 0 };

const HOST = {
  fetch: () => Promise.reject(new Error("nothing is read here")),
  now: () => 0,
  wait: () => Promise.resolve(),
  random: () => 0,
};

const phoneHolding = (kept?: SeatProfile) => {
  const written: unknown[] = [];
  let answer: () => void = () => undefined;
  const store: KeyValueStore = {
    read: () =>
      new Promise((settle) => {
        answer = () => settle(kept);
      }),
    write: (_key, value) => {
      written.push(value);
      return Promise.resolve();
    },
  };
  return {
    seatscout: createSeatScout({ ...HOST, store }),
    answer: () => answer(),
    written,
  };
};

describe("the Seat Profile this phone holds", () => {
  it("holds nothing until the phone's store has answered", async () => {
    const { seatscout } = phoneHolding(FRONT_ROW);

    const { result } = await renderHook(() =>
      useProfile(heldProfile(seatscout)),
    );

    expect(result.current).toBeUndefined();
  });

  it("holds the Profile the phone kept once the store answers", async () => {
    const phone = phoneHolding(FRONT_ROW);
    const held = heldProfile(phone.seatscout);
    const { result } = await renderHook(() => useProfile(held));

    await act(phone.answer);

    await waitFor(() => expect(result.current).toEqual(FRONT_ROW));
  });

  it("holds Reference when the phone kept none", async () => {
    const phone = phoneHolding();
    const held = heldProfile(phone.seatscout);
    const { result } = await renderHook(() => useProfile(held));

    await act(phone.answer);

    await waitFor(() => expect(result.current).toEqual(REFERENCE));
  });

  it("holds and keeps a Profile chosen, telling everyone who reads it", async () => {
    const phone = phoneHolding();
    const held = heldProfile(phone.seatscout);
    const { result } = await renderHook(() => useProfile(held));

    await act(() => held.choose(FRONT_ROW));

    expect(result.current).toEqual(FRONT_ROW);
    expect(phone.written).toEqual([FRONT_ROW]);
  });

  it("keeps a Profile chosen before the store answered over what the store held", async () => {
    const phone = phoneHolding(REFERENCE);
    const held = heldProfile(phone.seatscout);
    const { result } = await renderHook(() => useProfile(held));

    await act(() => held.choose(FRONT_ROW));
    await act(phone.answer);

    expect(result.current).toEqual(FRONT_ROW);
  });
});
