import { REFERENCE, type Theater } from "@seatscout/client";
import { describe, expect, it } from "vitest";
import type { ProgrammeState } from "./programme.js";
import { type Terms, termsFrom, termsOf } from "./terms.js";
import { EVERY_PARAMETER, TODAY } from "./terms.fixtures.js";
import { type TitleCardEntry, termLinesOf } from "./title-card-terms.js";

const NOTHING_READ: ProgrammeState = {
  phase: "none",
  theaters: [],
  movies: [],
};

const theaterOf = (id: string, name: string): readonly Theater[] =>
  (termsOf({ theaters: [id] }, TODAY).theaters ?? []).map((held) => ({
    id: held,
    name,
  }));

const playing = (): ProgrammeState => ({
  phase: "read",
  theaters: [
    ...theaterOf("aaxju", "AMC Village on the Parkway 9"),
    ...theaterOf("aacbt", "Cinemark Dallas XD and IMAX"),
  ],
  movies: [
    { id: "246329", title: "Coyote vs. Acme" },
    { id: "245569", title: "The Dog Stars (2026)" },
  ],
  unreached: [],
});

describe("the lines a title card states a Query in", () => {
  it("states the party size, then the Movie, then every other term, each entry carrying the term it opens", () => {
    expect(
      termLinesOf(
        { movie: "245569", date: "2026-08-28", area: "75006", partySize: 2 },
        NOTHING_READ,
        TODAY,
        REFERENCE,
      ),
    ).toEqual([
      [{ term: "partySize", words: "Two seats together" }],
      [{ term: "movie", words: "245569" }],
      [
        { term: "date", words: "Today" },
        { term: "area", words: "Near 75006" },
        { term: "formats", words: "Any showtime" },
        { term: "profile", words: "Reference seat" },
      ],
    ]);
  });

  it("asks for the Movie and the area a Query does not name", () => {
    expect(
      termLinesOf(
        { date: "2026-08-28", partySize: 2 },
        playing(),
        TODAY,
        REFERENCE,
      ),
    ).toEqual([
      [{ term: "partySize", words: "Two seats together" }],
      [{ term: "movie", words: "Which movie?" }],
      [
        { term: "date", words: "Today" },
        { term: "area", words: "Near where?" },
        { term: "formats", words: "Any showtime" },
        { term: "profile", words: "Reference seat" },
      ],
    ]);
  });

  it("names the Movie by its title once the programme holds it, and by its identity until then", () => {
    const tonight: Terms = {
      movie: "245569",
      date: "2026-08-28",
      area: "75006",
      partySize: 2,
    };

    expect(termLinesOf(tonight, playing(), TODAY, REFERENCE)[1]).toEqual([
      { term: "movie", words: "The Dog Stars (2026)" },
    ]);
    expect(
      termLinesOf(
        { ...tonight, movie: "999999" },
        playing(),
        TODAY,
        REFERENCE,
      )[1],
    ).toEqual([{ term: "movie", words: "999999" }]);
  });

  it.each<[string, Pick<Terms, "from" | "until">, readonly TitleCardEntry[]]>([
    [
      "a window with both ends",
      { from: "19:00", until: "21:00" },
      [{ term: "window", words: "7:00p to 9:00p" }],
    ],
    [
      "a window with only a start",
      { from: "19:00" },
      [{ term: "window", words: "from 7:00p" }],
    ],
    [
      "a window with only an end",
      { until: "21:00" },
      [{ term: "window", words: "until 9:00p" }],
    ],
    ["no window", {}, []],
  ])("states %s between the date and the area", (_named, window, stated) => {
    expect(
      termLinesOf(
        { date: "2026-08-29", area: "75006", partySize: 2, ...window },
        NOTHING_READ,
        TODAY,
        REFERENCE,
      )[2],
    ).toEqual([
      { term: "date", words: "Tomorrow" },
      ...stated,
      { term: "area", words: "Near 75006" },
      { term: "formats", words: "Any showtime" },
      { term: "profile", words: "Reference seat" },
    ]);
  });

  it("states every term a Query carries in the order the card draws them, the second and later value of a term joined by or", () => {
    expect(
      termLinesOf(
        termsFrom(EVERY_PARAMETER, TODAY),
        playing(),
        TODAY,
        REFERENCE,
      ),
    ).toEqual([
      [{ term: "partySize", words: "Two seats together" }],
      [{ term: "movie", words: "The Dog Stars (2026)" }],
      [
        { term: "date", words: "Today" },
        { term: "window", words: "7:00p to 9:00p" },
        { term: "area", words: "Near 75006" },
        { term: "formats", words: "Dolby Cinema" },
        { term: "formats", words: "IMAX", joinedBy: " or " },
        { term: "amenities", words: "Recliners" },
        { term: "chains", words: "AMC" },
        { term: "chains", words: "Landmark", joinedBy: " or " },
        { term: "theaters", words: "Cinemark Dallas XD and IMAX" },
        {
          term: "theaters",
          words: "AMC Village on the Parkway 9",
          joinedBy: " or ",
        },
        { term: "accessibleSeating", words: "Accessible seating" },
        { term: "profile", words: "Reference seat" },
      ],
    ]);
  });

  it.each<
    [string, Pick<Terms, "formats" | "amenities" | "chains">, TitleCardEntry]
  >([
    ["Format", { formats: ["IMAX"] }, { term: "formats", words: "IMAX" }],
    [
      "Amenity",
      { amenities: ["Recliners"] },
      { term: "amenities", words: "Recliners" },
    ],
    ["Chain", { chains: ["Landmark"] }, { term: "chains", words: "Landmark" }],
  ])(
    "states a Query that narrows by one %s alone as that value, joined to nothing",
    (_named, narrowing, stated) => {
      expect(
        termLinesOf(
          { date: "2026-08-28", area: "75006", partySize: 2, ...narrowing },
          NOTHING_READ,
          TODAY,
          REFERENCE,
        )[2],
      ).toEqual([
        { term: "date", words: "Today" },
        { term: "area", words: "Near 75006" },
        stated,
        { term: "profile", words: "Reference seat" },
      ]);
    },
  );

  it("names a Theater the programme does not hold by its identity", () => {
    const entries = termLinesOf(
      termsOf({ area: "75006", theaters: ["zzzzz", "aacbt", "aaxju"] }, TODAY),
      playing(),
      TODAY,
      REFERENCE,
    )[2];

    expect(entries).toEqual([
      { term: "date", words: "Today" },
      { term: "area", words: "Near 75006" },
      { term: "theaters", words: "zzzzz" },
      {
        term: "theaters",
        words: "Cinemark Dallas XD and IMAX",
        joinedBy: " or ",
      },
      {
        term: "theaters",
        words: "AMC Village on the Parkway 9",
        joinedBy: " or ",
      },
      { term: "profile", words: "Reference seat" },
    ]);
  });

  it("states accessible seating only for a Query that asks for it", () => {
    const tonight: Terms = { date: "2026-08-28", area: "75006", partySize: 2 };
    const termsStated = (terms: Terms) =>
      termLinesOf(terms, NOTHING_READ, TODAY, REFERENCE)[2].map(
        (entry) => entry.term,
      );

    expect(termsStated({ ...tonight, accessibleSeating: true })).toEqual([
      "date",
      "area",
      "formats",
      "accessibleSeating",
      "profile",
    ]);
    expect(termsStated({ ...tonight, accessibleSeating: false })).toEqual([
      "date",
      "area",
      "formats",
      "profile",
    ]);
    expect(termsStated(tonight)).toEqual([
      "date",
      "area",
      "formats",
      "profile",
    ]);
  });

  it("states a party of one as one seat, and a larger party as that many seats together", () => {
    const partyStated = (partySize: number) =>
      termLinesOf(
        { date: "2026-08-28", partySize },
        NOTHING_READ,
        TODAY,
        REFERENCE,
      )[0];

    expect(partyStated(1)).toEqual([{ term: "partySize", words: "One seat" }]);
    expect(partyStated(4)).toEqual([
      { term: "partySize", words: "Four seats together" },
    ]);
  });

  it("states a Seat Profile that departs from Reference as a custom seat", () => {
    expect(
      termLinesOf({ date: "2026-08-28", partySize: 2 }, NOTHING_READ, TODAY, {
        ...REFERENCE,
        targetDepth: 0,
      })[2].at(-1),
    ).toEqual({ term: "profile", words: "Custom seat" });
  });

  it("states the days a Query spans as the when term", () => {
    expect(
      termLinesOf(
        termsFrom([["date", "2026-08-29..2026-09-02"]], TODAY),
        NOTHING_READ,
        TODAY,
        REFERENCE,
      )[2][0],
    ).toEqual({ term: "date", words: "Sat 29 Aug to Wed 2 Sep" });
  });
});
