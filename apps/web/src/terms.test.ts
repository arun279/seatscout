import { describe, expect, it } from "vitest";
import { askedFrom } from "./asked.js";
import { queryOf, termsFrom } from "./terms.js";

const TODAY = "2026-08-28";

describe("the query terms a URL carries", () => {
  it("reads Movie, date, area and party size from the query string", () => {
    expect(
      termsFrom("?movie=245569&date=2026-08-29&area=75006&partySize=4", TODAY),
    ).toEqual({
      movie: "245569",
      date: "2026-08-29",
      area: "75006",
      partySize: 4,
    });
  });

  it("defaults to a party of two, today, and no Movie or area", () => {
    expect(termsFrom("", TODAY)).toEqual({ date: TODAY, partySize: 2 });
  });

  it("takes a party size that is a whole number of at least one, and two otherwise", () => {
    expect(termsFrom("?partySize=1", TODAY).partySize).toBe(1);
    expect(termsFrom("?partySize=0", TODAY).partySize).toBe(2);
    expect(termsFrom("?partySize=2.5", TODAY).partySize).toBe(2);
    expect(termsFrom("?partySize=six", TODAY).partySize).toBe(2);
    expect(termsFrom("?partySize=-3", TODAY).partySize).toBe(2);
  });

  it("takes a date only in the form a listing is asked for by", () => {
    expect(termsFrom("?date=2026-09-04", TODAY).date).toBe("2026-09-04");
    expect(termsFrom("?date=tomorrow", TODAY).date).toBe(TODAY);
    expect(termsFrom("?date=2026-9-4", TODAY).date).toBe(TODAY);
    expect(termsFrom("?date=x2026-09-04", TODAY).date).toBe(TODAY);
    expect(termsFrom("?date=2026-09-04x", TODAY).date).toBe(TODAY);
  });

  it("treats a blank Movie or area as absent", () => {
    expect(termsFrom("?movie=%20&area=", TODAY)).toEqual({
      date: TODAY,
      partySize: 2,
    });
  });

  it("writes the terms back as the query string it read, leaving out what is absent", () => {
    const terms = termsFrom(
      "?movie=245569&date=2026-08-29&area=75006&partySize=4",
      TODAY,
    );

    expect(queryOf(terms)).toBe(
      "?movie=245569&date=2026-08-29&area=75006&partySize=4",
    );
    expect(queryOf({ date: TODAY, partySize: 2 })).toBe(
      "?date=2026-08-28&partySize=2",
    );
    expect(
      queryOf({ movie: "a b", date: TODAY, area: "c&d", partySize: 3 }),
    ).toBe("?movie=a+b&date=2026-08-28&area=c%26d&partySize=3");
  });

  it("becomes a search once it names a Movie and an area, and not before", () => {
    expect(
      askedFrom({
        movie: "245569",
        date: TODAY,
        area: "75006",
        partySize: 3,
      }),
    ).toEqual({
      movie: "245569",
      date: TODAY,
      area: "75006",
      partySize: 3,
      accessibleSeating: false,
    });
    expect(
      askedFrom({ movie: "245569", date: TODAY, partySize: 3 }),
    ).toBeNull();
    expect(askedFrom({ area: "75006", date: TODAY, partySize: 3 })).toBeNull();
  });
});
