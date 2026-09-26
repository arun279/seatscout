import { describe, expect, it } from "vitest";
import { toggled } from "./chips.js";

describe("a chip pressed among a closed set", () => {
  const EVERY = ["IMAX", "Dolby Cinema", "3D"] as const;

  it("adds a value not yet chosen, in the order the set lists them", () => {
    expect(toggled(EVERY, ["3D"], "IMAX")).toEqual(["IMAX", "3D"]);
    expect(toggled(EVERY, undefined, "Dolby Cinema")).toEqual(["Dolby Cinema"]);
  });

  it("takes out a value already chosen", () => {
    expect(toggled(EVERY, ["IMAX", "3D"], "IMAX")).toEqual(["3D"]);
    expect(toggled(EVERY, ["IMAX"], "IMAX")).toEqual([]);
  });
});
