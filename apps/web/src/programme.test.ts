import type { Movie } from "@seatscout/client";
import { describe, expect, it } from "vitest";
import { movieOf, suggestedFor, titleOf } from "./programme.js";

const PLAYING: readonly Movie[] = [
  { id: "23184", title: "Akira" },
  { id: "246840", title: "Akira 4K Re-Release (2026)" },
  { id: "245476", title: "Colony (2026)" },
  { id: "246329", title: "Coyote vs. Acme" },
];

describe("the films playing near an area", () => {
  it("names the one a query asks for, and nothing for one that is not playing", () => {
    expect(titleOf(PLAYING, "246329")).toBe("Coyote vs. Acme");
    expect(titleOf(PLAYING, "999999")).toBeUndefined();
    expect(titleOf(PLAYING, undefined)).toBeUndefined();
  });

  it("takes a title typed whole, whatever its case and whatever space surrounds it", () => {
    expect(movieOf("Coyote vs. Acme", PLAYING)).toBe("246329");
    expect(movieOf("  coyote vs. acme  ", PLAYING)).toBe("246329");
    expect(movieOf("coyote", PLAYING)).toBeUndefined();
  });

  it("takes a film's number only where the whole of what was typed is one", () => {
    expect(movieOf(" 245569 ", PLAYING)).toBe("245569");
    for (const almost of ["245569x", "x245569", "24 5569", ""])
      expect(movieOf(almost, PLAYING)).toBeUndefined();
  });

  it("offers every film the typed letters appear in, wherever they appear", () => {
    expect(suggestedFor("co", PLAYING).map((movie) => movie.title)).toEqual([
      "Colony (2026)",
      "Coyote vs. Acme",
    ]);
    expect(suggestedFor("  co  ", PLAYING).map((movie) => movie.title)).toEqual(
      ["Colony (2026)", "Coyote vs. Acme"],
    );
    expect(suggestedFor("acme", PLAYING).map((movie) => movie.title)).toEqual([
      "Coyote vs. Acme",
    ]);
  });

  it("offers nothing for nothing typed, and nothing once one title is typed whole even where it opens another", () => {
    expect(suggestedFor("", PLAYING)).toEqual([]);
    expect(suggestedFor("   ", PLAYING)).toEqual([]);
    expect(suggestedFor("Akira", PLAYING)).toEqual([]);
    expect(suggestedFor("Akira 4", PLAYING)).toHaveLength(1);
  });
});
