import type { Movie, Theater } from "@seatscout/client";
import { describe, expect, it } from "vitest";
import { ASKING, playingStatusOf } from "./ask-phrases.js";
import type { Span } from "./when.js";
import type { ProgrammeState } from "./programme.js";
import { termsOf } from "./terms.js";

const TODAY = "2026-09-19";

const PLAYING: readonly Movie[] = [
  { id: "23184", title: "Akira" },
  { id: "245476", title: "Colony (2026)" },
];

const theaterOf = (id: string, name: string): readonly Theater[] =>
  (termsOf({ theaters: [id] }, TODAY).theaters ?? []).map((held) => ({
    id: held,
    name,
  }));

const NEARBY: readonly Theater[] = [
  ...theaterOf("aacbt", "Cinemark Dallas XD and IMAX"),
  ...theaterOf("aaxju", "AMC Village on the Parkway 9"),
];

const nothingYet: ProgrammeState = {
  phase: "none",
  theaters: [],
  movies: [],
};

const reading: ProgrammeState = { ...nothingYet, phase: "reading" };

const unreachable: ProgrammeState = { ...nothingYet, phase: "unreachable" };

const readAs = (
  movies: readonly Movie[],
  unreached: readonly Theater[] = [],
): ProgrammeState => ({
  phase: "read",
  theaters: NEARBY,
  movies,
  unreached,
});

describe("what the film field says about the listing under it", () => {
  it("asks for an area while the query names none", () => {
    expect(
      playingStatusOf(nothingYet, undefined, { date: TODAY }, TODAY),
    ).toEqual({
      words: "Name an area to see what is playing.",
      unreadable: false,
    });
  });

  it("names the area it is reading", () => {
    expect(playingStatusOf(reading, "75006", { date: TODAY }, TODAY)).toEqual({
      words: "Reading what is playing near 75006",
      unreadable: false,
    });
  });

  it("says when the listing could not be read at all", () => {
    expect(
      playingStatusOf(unreachable, "75006", { date: TODAY }, TODAY),
    ).toEqual({
      words: "What is playing near 75006 could not be read.",
      unreadable: true,
    });
  });

  it("counts what is playing, and when", () => {
    expect(
      playingStatusOf(readAs(PLAYING), "75006", { date: "2026-09-26" }, TODAY)
        .words,
    ).toBe("2 films playing near 75006 on Sat 26 Sep");
  });

  it("says the films are the nearest day's, and names every day the query holds", () => {
    const said = (span: Span) =>
      playingStatusOf(readAs(PLAYING), "75006", span, TODAY).words;

    expect(
      said({
        date: "2026-09-26",
        when: {
          kind: "days",
          dates: ["2026-09-26", "2026-09-29", "2026-10-02"],
        },
      }),
    ).toBe(
      "2 films playing near 75006 on Sat 26 Sep, the nearest of Sat 26, Tue 29 Sep, Fri 2 Oct",
    );
    expect(
      said({
        date: "2026-09-26",
        when: { kind: "range", first: "2026-09-26", last: "2026-09-30" },
      }),
    ).toBe(
      "2 films playing near 75006 on Sat 26 Sep, the nearest of Sat 26 to Wed 30 Sep",
    );
    expect(said({ date: TODAY, when: { kind: "any" } })).toBe(
      "2 films playing near 75006 today, the nearest of any day in the next 7 days",
    );
  });

  it("says today rather than a date when the date is today", () => {
    expect(
      playingStatusOf(readAs(PLAYING), "75006", { date: TODAY }, TODAY).words,
    ).toBe("2 films playing near 75006 today");
  });

  it("counts one film in the singular", () => {
    expect(
      playingStatusOf(
        readAs(PLAYING.slice(0, 1)),
        "75006",
        { date: TODAY },
        TODAY,
      ).words,
    ).toBe("1 film playing near 75006 today");
  });

  it("counts none without pretending the listing is short", () => {
    expect(
      playingStatusOf(readAs([]), "75006", { date: TODAY }, TODAY),
    ).toEqual({
      words: "0 films playing near 75006 today",
      unreadable: false,
    });
  });

  it("names the Theaters whose films could not be read", () => {
    expect(
      playingStatusOf(readAs(PLAYING, NEARBY), "75006", { date: TODAY }, TODAY),
    ).toEqual({
      words:
        "Films at 2 theaters could not be read: Cinemark Dallas XD and IMAX, AMC Village on the Parkway 9.",
      unreadable: true,
    });
  });

  it("names the one Theater it could not read in the singular", () => {
    expect(
      playingStatusOf(
        readAs(PLAYING, NEARBY.slice(0, 1)),
        "75006",
        { date: TODAY },
        TODAY,
      ).words,
    ).toBe(
      "Films at 1 theater could not be read: Cinemark Dallas XD and IMAX.",
    );
  });
});

describe("the words the Ask sheet is asked in", () => {
  it("says something for every control and every heading it names", () => {
    const named = [
      "heading",
      "keep",
      "area",
      "areaDecides",
      "film",
      "when",
      "party",
      "fewer",
      "more",
      "kept",
      "from",
      "until",
      "anyTime",
      "clear",
      "accessible",
      "accessibleNote",
      "format",
      "comfort",
      "chain",
      "theater",
    ] as const;

    for (const line of named)
      expect([line, ASKING[line].trim()]).not.toEqual([line, ""]);
  });

  it("names a range's two days apart from the time window's two ends", () => {});

  it("names each kind of when term", () => {
    for (const kind of ["day", "days", "range", "any"] as const)
      expect([kind, ASKING.kinds[kind].trim()]).not.toEqual([kind, ""]);
  });
});
