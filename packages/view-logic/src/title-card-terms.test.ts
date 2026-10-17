import { REFERENCE, type Theater } from "@seatscout/client";
import { describe, expect, it } from "vitest";
import type { ProgrammeState } from "./programme.js";
import { EVERY_PARAMETER, TODAY } from "./terms.fixtures.js";
import { type Terms, termsFrom, termsOf } from "./terms.js";
import { TERMS, type TitleCardEntry, titleCardOf } from "./title-card-terms.js";

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

const entriesOf = (
  terms: Terms,
  programme: ProgrammeState = NOTHING_READ,
): readonly TitleCardEntry[] =>
  titleCardOf(terms, programme, TODAY, REFERENCE).groups.flatMap(
    (group) => group.entries,
  );

describe("the rows and chips a title card states a Query in", () => {
  it("states the party, the area and the Movie as rows, the day and time as chips When, and the theaters and seat as chips Where", () => {
    expect(
      titleCardOf(
        { movie: "245569", date: "2026-08-28", area: "75006", partySize: 2 },
        NOTHING_READ,
        TODAY,
        REFERENCE,
      ),
    ).toEqual({
      party: "Two seats together",
      area: "Near 75006",
      movie: "Your movie",
      groups: [
        {
          lead: "When",
          entries: [
            { term: "date", words: "Today" },
            { term: "window", words: "Any time" },
          ],
        },
        {
          lead: "Where",
          entries: [
            { term: "narrowing", words: "Any theater" },
            { term: "profile", words: "Reference seat" },
          ],
        },
      ],
    });
  });

  it("asks for the area and the Movie a Query does not name", () => {
    expect(
      titleCardOf({ date: "2026-08-28", partySize: 2 }, playing(), TODAY, {
        ...REFERENCE,
        targetDepth: 0,
      }),
    ).toEqual({
      party: "Two seats together",
      area: "Near where?",
      movie: "Which movie?",
      groups: [
        {
          lead: "When",
          entries: [
            { term: "date", words: "Today" },
            { term: "window", words: "Any time" },
          ],
        },
        {
          lead: "Where",
          entries: [
            { term: "narrowing", words: "Any theater" },
            { term: "profile", words: "Custom seat" },
          ],
        },
      ],
    });
  });

  it("names the Movie by the programme's title, else by the title the query carries, and never by its identity", () => {
    const tonight: Terms = {
      movie: "245569",
      date: "2026-08-28",
      area: "75006",
      partySize: 2,
    };
    const movieOf = (terms: Terms, programme: ProgrammeState) =>
      titleCardOf(terms, programme, TODAY, REFERENCE).movie;

    expect(movieOf(tonight, playing())).toBe("The Dog Stars (2026)");
    expect(movieOf({ ...tonight, title: "Carried" }, playing())).toBe(
      "The Dog Stars (2026)",
    );
    expect(
      movieOf({ ...tonight, title: "The Dog Stars (2026)" }, NOTHING_READ),
    ).toBe("The Dog Stars (2026)");
    expect(movieOf({ ...tonight, movie: "999999" }, playing())).toBe(
      "Your movie",
    );
  });

  it.each<[string, Pick<Terms, "from" | "until">, string]>([
    [
      "a window with both ends",
      { from: "19:00", until: "21:00" },
      "7:00p to 9:00p",
    ],
    ["a window with only a start", { from: "19:00" }, "From 7:00p"],
    ["a window with only an end", { until: "21:00" }, "Until 9:00p"],
    ["no window", {}, "Any time"],
  ])("states %s as the chip after the days", (_named, window, words) => {
    expect(
      entriesOf({ date: "2026-08-29", area: "75006", partySize: 2, ...window }),
    ).toEqual([
      { term: "date", words: "Tomorrow" },
      { term: "window", words },
      { term: "narrowing", words: "Any theater" },
      { term: "profile", words: "Reference seat" },
    ]);
  });

  it("states every value that narrows the showtimes as a chip of its own, each opening the one editor that narrows them", () => {
    expect(
      entriesOf(termsFrom(EVERY_PARAMETER, TODAY), playing()).filter(
        (chip) => chip.term === "narrowing",
      ),
    ).toEqual([
      { term: "narrowing", words: "Dolby Cinema" },
      { term: "narrowing", words: "IMAX" },
      { term: "narrowing", words: "Recliners" },
      { term: "narrowing", words: "AMC" },
      { term: "narrowing", words: "Landmark" },
      { term: "narrowing", words: "Cinemark Dallas XD and IMAX" },
      { term: "narrowing", words: "AMC Village on the Parkway 9" },
    ]);
  });

  it.each<
    [string, Pick<Terms, "formats" | "amenities" | "chains">, TitleCardEntry]
  >([
    ["Format", { formats: ["IMAX"] }, { term: "narrowing", words: "IMAX" }],
    [
      "Amenity",
      { amenities: ["Recliners"] },
      { term: "narrowing", words: "Recliners" },
    ],
    [
      "Chain",
      { chains: ["Landmark"] },
      { term: "narrowing", words: "Landmark" },
    ],
  ])(
    "states a Query that narrows by one %s alone as that value, in place of any theater",
    (_named, narrowing, stated) => {
      expect(
        entriesOf({
          date: "2026-08-28",
          area: "75006",
          partySize: 2,
          ...narrowing,
        }),
      ).toEqual([
        { term: "date", words: "Today" },
        { term: "window", words: "Any time" },
        stated,
        { term: "profile", words: "Reference seat" },
      ]);
    },
  );

  it("names a Theater the programme does not hold by its identity", () => {
    expect(
      entriesOf(
        termsOf({ area: "75006", theaters: ["zzzzz", "aacbt"] }, TODAY),
        playing(),
      ).filter((chip) => chip.term === "narrowing"),
    ).toEqual([
      { term: "narrowing", words: "zzzzz" },
      { term: "narrowing", words: "Cinemark Dallas XD and IMAX" },
    ]);
  });

  it("states accessible seating only for a Query that asks for it, Where before the seat, opening the seats", () => {
    const tonight: Terms = { date: "2026-08-28", area: "75006", partySize: 2 };
    const whereOf = (terms: Terms) =>
      titleCardOf(terms, NOTHING_READ, TODAY, REFERENCE).groups[1];

    expect(whereOf({ ...tonight, accessibleSeating: true })).toEqual({
      lead: "Where",
      entries: [
        { term: "narrowing", words: "Any theater" },
        { term: "partySize", words: "Accessible seating" },
        { term: "profile", words: "Reference seat" },
      ],
    });
    expect(whereOf({ ...tonight, accessibleSeating: false })?.entries).toEqual([
      { term: "narrowing", words: "Any theater" },
      { term: "profile", words: "Reference seat" },
    ]);
  });

  it("states a party of one as one seat, and a larger party as that many seats together", () => {
    const partyOf = (partySize: number) =>
      titleCardOf(
        { date: "2026-08-28", partySize },
        NOTHING_READ,
        TODAY,
        REFERENCE,
      ).party;

    expect(partyOf(1)).toBe("One seat");
    expect(partyOf(4)).toBe("Four seats together");
  });

  it("states the days a Query spans as the first chip", () => {
    expect(
      entriesOf(termsFrom([["date", "2026-08-29..2026-09-02"]], TODAY))[0],
    ).toEqual({ term: "date", words: "Sat 29 Aug to Wed 2 Sep" });
  });

  it("opens exactly the editors there are, between its rows and its chips", () => {
    const every = termsFrom(EVERY_PARAMETER, TODAY);
    const opened = [
      "partySize",
      "area",
      "movie",
      ...entriesOf(every).map((chip) => chip.term),
    ];

    expect(new Set(opened)).toEqual(new Set(TERMS));
    expect(TERMS).toHaveLength(new Set(TERMS).size);
  });
});
