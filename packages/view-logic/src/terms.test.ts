import { describe, expect, it } from "vitest";
import { parametersOf, termsFrom, termsOf, windowIn } from "./terms.js";
import { EVERY_PARAMETER, TODAY } from "./terms.fixtures.js";

describe("the query terms an address carries", () => {
  it("gives the window's two fields the empty string when the address holds no window", () => {
    expect(windowIn(termsFrom([], TODAY))).toEqual({ from: "", until: "" });
    expect(
      windowIn(
        termsFrom(
          [
            ["from", "19:00"],
            ["until", "21:00"],
          ],
          TODAY,
        ),
      ),
    ).toEqual({ from: "19:00", until: "21:00" });
  });

  it("holds a value the address names twice once, and writes it once", () => {
    const twice = termsFrom(
      [
        ["theater", "aacbt"],
        ["theater", "aacbt"],
        ["chain", "AMC"],
        ["chain", "AMC"],
      ],
      TODAY,
    );

    expect(twice.theaters).toEqual(["aacbt"]);
    expect(twice.chains).toEqual(["AMC"]);
    expect(parametersOf(twice)).toEqual([
      ["date", "2026-08-28"],
      ["partySize", "2"],
      ["chain", "AMC"],
      ["theater", "aacbt"],
    ]);
  });

  it("reads Movie, date, area and party size from the parameters", () => {
    expect(
      termsFrom(
        [
          ["movie", "245569"],
          ["date", "2026-08-29"],
          ["area", "75006"],
          ["partySize", "4"],
        ],
        TODAY,
      ),
    ).toEqual({
      movie: "245569",
      date: "2026-08-29",
      area: "75006",
      partySize: 4,
    });
  });

  it("defaults to a party of two, today, and no Movie or area", () => {
    expect(termsFrom([], TODAY)).toEqual({ date: TODAY, partySize: 2 });
  });

  it("takes a party size that is a whole number of at least one, and two otherwise", () => {
    expect(termsFrom([["partySize", "1"]], TODAY).partySize).toBe(1);
    expect(termsFrom([["partySize", "0"]], TODAY).partySize).toBe(2);
    expect(termsFrom([["partySize", "2.5"]], TODAY).partySize).toBe(2);
    expect(termsFrom([["partySize", "six"]], TODAY).partySize).toBe(2);
    expect(termsFrom([["partySize", "-3"]], TODAY).partySize).toBe(2);
  });

  it("takes a date only in the form a listing is asked for by", () => {
    expect(termsFrom([["date", "2026-09-04"]], TODAY).date).toBe("2026-09-04");
    expect(termsFrom([["date", "tomorrow"]], TODAY).date).toBe(TODAY);
    expect(termsFrom([["date", "2026-9-4"]], TODAY).date).toBe(TODAY);
    expect(termsFrom([["date", "x2026-09-04"]], TODAY).date).toBe(TODAY);
    expect(termsFrom([["date", "2026-09-04x"]], TODAY).date).toBe(TODAY);
  });

  it("treats a blank Movie or area as absent", () => {
    expect(
      termsFrom(
        [
          ["movie", " "],
          ["area", ""],
        ],
        TODAY,
      ),
    ).toEqual({ date: TODAY, partySize: 2 });
  });

  it("writes the terms back as the parameters it read, leaving out what is absent", () => {
    const terms = termsFrom(
      [
        ["movie", "245569"],
        ["date", "2026-08-29"],
        ["area", "75006"],
        ["partySize", "4"],
      ],
      TODAY,
    );

    expect(parametersOf(terms)).toEqual([
      ["movie", "245569"],
      ["date", "2026-08-29"],
      ["area", "75006"],
      ["partySize", "4"],
    ]);
    expect(parametersOf({ date: TODAY, partySize: 2 })).toEqual([
      ["date", "2026-08-28"],
      ["partySize", "2"],
    ]);
  });

  it("reads every narrowing term the glossary names: Chain, Theater, Format, Amenity, a time window and accessible seating", () => {
    expect(termsFrom(EVERY_PARAMETER, TODAY)).toEqual({
      movie: "245569",
      date: "2026-08-28",
      area: "75006",
      partySize: 2,
      chains: ["AMC", "Landmark"],
      theaters: ["aacbt", "aaxju"],
      formats: ["Dolby Cinema", "IMAX"],
      amenities: ["Recliners"],
      from: "19:00",
      until: "21:00",
      accessibleSeating: true,
    });
  });

  it("keeps only what the closed sets hold, a clock in the form a window is asked by, and accessible seating only when it is asked for", () => {
    expect(
      termsFrom(
        [
          ["chain", "Regal"],
          ["format", "IMAX 70mm"],
          ["amenity", "Popcorn"],
          ["from", "7pm"],
          ["until", "25:00"],
          ["accessibleSeating", "maybe"],
        ],
        TODAY,
      ),
    ).toEqual({ date: TODAY, partySize: 2 });
    expect(
      termsFrom(
        [
          ["chain", "AMC"],
          ["chain", "Regal"],
          ["from", "07:05"],
          ["until", "23:59"],
        ],
        TODAY,
      ),
    ).toEqual({
      date: TODAY,
      partySize: 2,
      chains: ["AMC"],
      from: "07:05",
      until: "23:59",
    });
  });

  it("takes a time only on the clock the address states, anchored end to end", () => {
    expect(
      termsFrom(
        [
          ["from", "19:00"],
          ["until", "21:00"],
        ],
        TODAY,
      ),
    ).toMatchObject({ from: "19:00", until: "21:00" });
    for (const clock of ["7:00", "x19:00", "19:00x", "24:00", "19:60"])
      expect(termsFrom([["from", clock]], TODAY).from).toBeUndefined();
  });

  it("trims a Theater the address padded, and drops one it left empty", () => {
    expect(
      termsFrom(
        [
          ["theater", " aacbt "],
          ["theater", "  "],
          ["theater", "aaxju"],
        ],
        TODAY,
      ).theaters,
    ).toEqual(["aacbt", "aaxju"]);
  });

  it("writes every term back as the parameters it read, and leaves out what was not asked", () => {
    expect(parametersOf(termsFrom(EVERY_PARAMETER, TODAY))).toEqual(
      EVERY_PARAMETER,
    );
    expect(
      parametersOf(
        termsFrom(
          [
            ["chain", "AMC"],
            ["chain", "Regal"],
            ["from", "07:05"],
          ],
          TODAY,
        ),
      ),
    ).toEqual([
      ["date", "2026-08-28"],
      ["partySize", "2"],
      ["chain", "AMC"],
      ["from", "07:05"],
    ]);
  });
});

describe("the query terms a recent search carries", () => {
  it("takes the party size and the accessible seating it holds as a number and a flag, not as text", () => {
    expect(
      termsOf(
        {
          movie: "245569",
          date: "2026-08-29",
          area: "75006",
          partySize: 4,
          accessibleSeating: true,
        },
        TODAY,
      ),
    ).toEqual({
      movie: "245569",
      date: "2026-08-29",
      area: "75006",
      partySize: 4,
      accessibleSeating: true,
    });
  });
});
