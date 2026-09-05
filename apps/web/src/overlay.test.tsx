import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useOverlays } from "./overlay.js";

describe("what is open over the screen", () => {
  afterEach(cleanup);

  it("takes back the sheet on top and leaves the one it opened over, then leaves the screen bare", () => {
    const { result } = renderHook(() => useOverlays());

    act(() => result.current.open({ kind: "ask", focus: "movie" }));
    act(() => result.current.open({ kind: "ask", focus: "date" }));
    act(() => result.current.close());

    expect(result.current.stack).toEqual([{ kind: "ask", focus: "movie" }]);

    act(() => result.current.close());

    expect(result.current.stack).toEqual([]);
  });
});
