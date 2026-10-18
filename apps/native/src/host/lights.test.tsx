import { afterEach, describe, expect, it, jest } from "@jest/globals";
import type { KeyValueStore } from "@seatscout/client";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { Appearance } from "react-native";
import { heldLights, useLights } from "./lights.js";

afterEach(() => {
  jest.mocked(Appearance.setColorScheme).mockRestore();
});

const phoneHolding = (kept?: unknown, onWeb = false) => {
  const set = jest.spyOn(Appearance, "setColorScheme");
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
  return {
    held: heldLights(store, onWeb),
    answer: () => answer(),
    written,
    schemes: () => set.mock.calls.map(([scheme]) => scheme),
  };
};

describe("the house lights this phone holds", () => {
  it("holds nothing, and overrides nothing, until the phone's store has answered", async () => {
    const phone = phoneHolding("up");

    const { result } = await renderHook(() => useLights(phone.held));

    expect(result.current).toBeUndefined();
    expect(phone.schemes()).toEqual([]);
  });

  it("holds the choice the phone kept once the store answers, and holds the phone's own controls to it", async () => {
    const phone = phoneHolding("up");
    const { result } = await renderHook(() => useLights(phone.held));

    await act(phone.answer);

    await waitFor(() => expect(result.current).toBe("up"));
    expect(phone.schemes()).toEqual(["light"]);
  });

  it("follows the system when the phone kept no choice", async () => {
    const phone = phoneHolding();
    const { result } = await renderHook(() => useLights(phone.held));

    await act(phone.answer);

    await waitFor(() => expect(result.current).toBe("system"));
    expect(phone.schemes()).toEqual(["unspecified"]);
  });

  it("follows the system when what the phone kept is no choice it offers", async () => {
    const phone = phoneHolding("dim");
    const { result } = await renderHook(() => useLights(phone.held));

    await act(phone.answer);

    await waitFor(() => expect(result.current).toBe("system"));
  });

  it("holds, overrides and keeps a choice at once, telling everyone who reads it", async () => {
    const phone = phoneHolding();
    const { result } = await renderHook(() => useLights(phone.held));

    await act(() => phone.held.choose("down"));

    expect(result.current).toBe("down");
    expect(phone.schemes()).toEqual(["dark"]);
    expect(phone.written).toEqual([["seatscout.houseLights.v1", "down"]]);
  });

  it("keeps a choice made before the store answered over what the store held", async () => {
    const phone = phoneHolding("up");
    const { result } = await renderHook(() => useLights(phone.held));

    await act(() => phone.held.choose("down"));
    await act(phone.answer);

    expect(result.current).toBe("down");
    expect(phone.schemes()).toEqual(["dark"]);
  });

  it("leaves a web page's controls to the browser, which has no override, and still holds the choice", async () => {
    const phone = phoneHolding(undefined, true);
    const { result } = await renderHook(() => useLights(phone.held));

    await act(() => phone.held.choose("down"));

    expect(result.current).toBe("down");
    expect(phone.schemes()).toEqual([]);
  });
});
