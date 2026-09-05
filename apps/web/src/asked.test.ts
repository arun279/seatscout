import { describe, expect, it } from "vitest";
import { REFERENCE } from "@seatscout/client";
import { askedFrom } from "./asked.js";
import { termsFrom } from "./terms.js";

const TODAY = "2026-08-28";
const EVERYTHING =
  "?movie=245569&date=2026-08-28&area=75006&partySize=2&chain=AMC&chain=Landmark&theater=aacbt&theater=aaxju&format=Dolby+Cinema&format=IMAX&amenity=Recliners&from=19%3A00&until=21%3A00&accessibleSeating=true";

describe("the search a query becomes", () => {
  it("becomes a search once it names a Movie and an area, and not before", () => {
    expect(
      askedFrom(
        {
          movie: "245569",
          date: TODAY,
          area: "75006",
          partySize: 3,
        },
        REFERENCE,
      ),
    ).toEqual({
      movie: "245569",
      date: TODAY,
      area: "75006",
      partySize: 3,
      accessibleSeating: false,
      profile: REFERENCE,
    });
    expect(
      askedFrom({ movie: "245569", date: TODAY, partySize: 3 }, REFERENCE),
    ).toBeNull();
    expect(
      askedFrom({ area: "75006", date: TODAY, partySize: 3 }, REFERENCE),
    ).toBeNull();
  });

  it("becomes a search carrying every term, with the window on the date and no term where none was asked", () => {
    expect(askedFrom(termsFrom(EVERYTHING, TODAY), REFERENCE)).toEqual({
      movie: "245569",
      date: "2026-08-28",
      area: "75006",
      partySize: 2,
      accessibleSeating: true,
      profile: REFERENCE,
      chains: ["AMC", "Landmark"],
      theaters: ["aacbt", "aaxju"],
      formats: ["Dolby Cinema", "IMAX"],
      amenities: ["Recliners"],
      from: "2026-08-28T19:00",
      until: "2026-08-28T21:00",
    });
    expect(
      Object.keys(
        askedFrom(
          {
            movie: "245569",
            date: TODAY,
            area: "75006",
            partySize: 2,
          },
          REFERENCE,
        ) ?? {},
      ).toSorted(),
    ).toEqual([
      "accessibleSeating",
      "area",
      "date",
      "movie",
      "partySize",
      "profile",
    ]);
  });
});
