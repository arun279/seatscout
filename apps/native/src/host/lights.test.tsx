import { describe, expect, it, jest } from "@jest/globals";
import type { HouseLights, KeyValueStore } from "@seatscout/client";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { Appearance } from "react-native";
import { heldLights, overriding, useLights } from "./lights.js";

const phoneHolding = (kept?: unknown) => {
  const written: [string, unknown][] = [];
  const applied: HouseLights[] = [];
  let answer: () => void = () => undefined;
  const store: KeyValueStore = {
    read: (key) =>
      new Promise((settle) => {
        answer = () => settle(key === "seatscout.appearance.v1" ? kept : 0);
      }),
    write: (key, value) => {
      written.push([key, value]);
      return Promise.resolve();
    },
  };
  return {
    held: heldLights(store, (lights) => applied.push(lights)),
    answer: () => answer(),
    written,
    applied,
  };
};

describe("the house lights this phone holds", () => {
  it("holds nothing, and applies nothing, until the phone's store has answered", async () => {
    const phone = phoneHolding("up");

    const { result } = await renderHook(() => useLights(phone.held));

    expect(result.current).toBeUndefined();
    expect(phone.applied).toEqual([]);
  });

  it("holds and applies the choice the phone kept once the store answers", async () => {
    const phone = phoneHolding("up");
    const { result } = await renderHook(() => useLights(phone.held));

    await act(phone.answer);

    await waitFor(() => expect(result.current).toBe("up"));
    expect(phone.applied).toEqual(["up"]);
  });

  it("follows the system when the phone kept no choice", async () => {
    const phone = phoneHolding();
    const { result } = await renderHook(() => useLights(phone.held));

    await act(phone.answer);

    await waitFor(() => expect(result.current).toBe("system"));
    expect(phone.applied).toEqual(["system"]);
  });

  it("follows the system when what the phone kept is no choice it offers", async () => {
    const phone = phoneHolding("dim");
    const { result } = await renderHook(() => useLights(phone.held));

    await act(phone.answer);

    await waitFor(() => expect(result.current).toBe("system"));
  });

  it("holds, applies and keeps a choice at once, telling everyone who reads it", async () => {
    const phone = phoneHolding();
    const { result } = await renderHook(() => useLights(phone.held));

    await act(() => phone.held.choose("down"));

    expect(result.current).toBe("down");
    expect(phone.applied).toEqual(["down"]);
    expect(phone.written).toEqual([["seatscout.appearance.v1", "down"]]);
  });

  it("keeps a choice made before the store answered over what the store held", async () => {
    const phone = phoneHolding("up");
    const { result } = await renderHook(() => useLights(phone.held));

    await act(() => phone.held.choose("down"));
    await act(phone.answer);

    expect(result.current).toBe("down");
    expect(phone.applied).toEqual(["down"]);
  });
});

describe("the phone's own controls under the house lights", () => {
  it("holds the phone's own controls dark, light, or back on the system's setting", () => {
    const set = jest.spyOn(Appearance, "setColorScheme");
    const apply = overriding(false);

    apply("down");
    apply("up");
    apply("system");

    expect(set.mock.calls).toEqual([["dark"], ["light"], ["unspecified"]]);
    set.mockRestore();
  });

  it("leaves a web page's controls to the browser, which has no override", () => {
    const set = jest.spyOn(Appearance, "setColorScheme");

    overriding(true)("down");

    expect(set).not.toHaveBeenCalled();
    set.mockRestore();
  });
});
