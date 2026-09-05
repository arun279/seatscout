import { describe, expect, it } from "vitest";
import { queryOf, searchTermsOf, termsFrom } from "./terms.js";

const TODAY = "2026-08-28";
const EVERYTHING =
  "?movie=245569&date=2026-08-28&area=75006&partySize=2&chain=AMC&chain=Landmark&theater=aacbt&theater=aaxju&format=Dolby+Cinema&format=IMAX&amenity=Recliners&from=19%3A00&until=21%3A00&accessibleSeating=true";

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
      searchTermsOf({
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
      searchTermsOf({ movie: "245569", date: TODAY, partySize: 3 }),
    ).toBeNull();
    expect(
      searchTermsOf({ area: "75006", date: TODAY, partySize: 3 }),
    ).toBeNull();
  });

  it("reads every narrowing term the glossary names: Chain, Theater, Format, Amenity, a time window and accessible seating", () => {
    expect(termsFrom(EVERYTHING, TODAY)).toEqual({
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
        "?chain=Regal&format=IMAX+70mm&amenity=Popcorn&from=7pm&until=25:00&accessibleSeating=maybe",
        TODAY,
      ),
    ).toEqual({ date: TODAY, partySize: 2 });
    expect(
      termsFrom("?chain=AMC&chain=Regal&from=07:05&until=23:59", TODAY),
    ).toEqual({
      date: TODAY,
      partySize: 2,
      chains: ["AMC"],
      from: "07:05",
      until: "23:59",
    });
  });

  it("writes every term back as the query string it read, and leaves out what was not asked", () => {
    expect(queryOf(termsFrom(EVERYTHING, TODAY))).toBe(EVERYTHING);
    expect(queryOf(termsFrom("?chain=AMC&chain=Regal&from=07:05", TODAY))).toBe(
      "?date=2026-08-28&partySize=2&chain=AMC&from=07%3A05",
    );
  });

  it("becomes a search carrying every term, with the window on the date and no term where none was asked", () => {
    expect(searchTermsOf(termsFrom(EVERYTHING, TODAY))).toEqual({
      movie: "245569",
      date: "2026-08-28",
      area: "75006",
      partySize: 2,
      accessibleSeating: true,
      chains: ["AMC", "Landmark"],
      theaters: ["aacbt", "aaxju"],
      formats: ["Dolby Cinema", "IMAX"],
      amenities: ["Recliners"],
      from: "2026-08-28T19:00",
      until: "2026-08-28T21:00",
    });
    expect(
      Object.keys(
        searchTermsOf({
          movie: "245569",
          date: TODAY,
          area: "75006",
          partySize: 2,
        }) ?? {},
      ).toSorted(),
    ).toEqual(["accessibleSeating", "area", "date", "movie", "partySize"]);
  });
});
