import { describe, expect, it } from "@jest/globals";
import type { KeyValueStore } from "@seatscout/client";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { heldLights, useLights } from "./lights.js";

const phoneHolding = (kept?: unknown) => {
  const written: [string, unknown][] = [];
  let answer: () => void = () => undefined;
  const store: KeyValueStore = {
    read: (key) =>
      new Promise((settle) => {
        answer = () => settle(key === "seatscout.houseLights.v1" ? kept : 0);
      }),
    write: (key, value) => {
      written.push([key, value]);
      return Promise.resolve();
    },
  };
  return { held: heldLights(store), answer: () => answer(), written };
};

describe("the house lights this phone holds", () => {
  it("holds nothing until the phone's store has answered", async () => {
    const phone = phoneHolding("up");

    const { result } = await renderHook(() => useLights(phone.held));

    expect(result.current).toBeUndefined();
  });

  it("holds the choice the phone kept once the store answers", async () => {
    const phone = phoneHolding("up");
    const { result } = await renderHook(() => useLights(phone.held));

    await act(phone.answer);

    await waitFor(() => expect(result.current).toBe("up"));
  });

  it("follows the system when the phone kept no choice", async () => {
    const phone = phoneHolding();
    const { result } = await renderHook(() => useLights(phone.held));

    await act(phone.answer);

    await waitFor(() => expect(result.current).toBe("system"));
  });

  it("follows the system when what the phone kept is no choice it offers", async () => {
    const phone = phoneHolding("dim");
    const { result } = await renderHook(() => useLights(phone.held));

    await act(phone.answer);

    await waitFor(() => expect(result.current).toBe("system"));
  });

  it("holds and keeps a choice at once, telling everyone who reads it", async () => {
    const phone = phoneHolding();
    const { result } = await renderHook(() => useLights(phone.held));

    await act(() => phone.held.choose("down"));

    expect(result.current).toBe("down");
    expect(phone.written).toEqual([["seatscout.houseLights.v1", "down"]]);
  });

  it("keeps a choice made before the store answered over what the store held", async () => {
    const phone = phoneHolding("up");
    const { result } = await renderHook(() => useLights(phone.held));

    await act(() => phone.held.choose("down"));
    await act(phone.answer);

    expect(result.current).toBe("down");
  });
});
