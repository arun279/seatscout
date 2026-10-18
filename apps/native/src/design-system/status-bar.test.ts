import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook } from "@testing-library/react-native";
import { StatusBar } from "react-native";
import type { Appearance } from "../theme.js";
import { useLitStatusBar } from "./status-bar.js";

afterEach(() => {
  jest.restoreAllMocks();
});

describe("the phone's status bar under the house lights", () => {
  it("writes the clock light with the house lights down, and dark once they come up", async () => {
    const set = jest.spyOn(StatusBar, "setBarStyle");
    const { rerender } = await renderHook(
      ({ appearance }: { readonly appearance: Appearance }) =>
        useLitStatusBar(appearance),
      { initialProps: { appearance: "down" } },
    );

    await rerender({ appearance: "up" });

    expect(set.mock.calls).toEqual([["light-content"], ["dark-content"]]);
  });
});
