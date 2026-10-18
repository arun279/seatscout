import { describe, expect, it } from "vitest";
import { HOUSE_LIGHTS, lightsSaidOf } from "./lights-phrases.js";

describe("the words the house lights are chosen in", () => {
  it("offers the system's setting first, then down and up", () => {
    expect(HOUSE_LIGHTS.choices).toEqual([
      { value: "system", text: "System" },
      { value: "down", text: "Down" },
      { value: "up", text: "Up" },
    ]);
  });

  it("says what the system's setting comes to right now, so nobody has to work it out", () => {
    expect(lightsSaidOf("system", "down")).toBe("System · down right now");
    expect(lightsSaidOf("system", "up")).toBe("System · up right now");
  });

  it("says something for every line of the section", () => {
    for (const line of [HOUSE_LIGHTS.label, HOUSE_LIGHTS.note])
      expect(line.trim()).not.toBe("");
  });

  it("says a held choice holds whatever the phone says", () => {
    expect(lightsSaidOf("down", "down")).toBe("Always down");
    expect(lightsSaidOf("up", "up")).toBe("Always up");
  });
});
