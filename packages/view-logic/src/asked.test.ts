import { describe, expect, it } from "vitest";
import { REFERENCE } from "@seatscout/client";
import { askedFrom, keyOf } from "./asked.js";
import { termsFrom } from "./terms.js";
import { EVERY_PARAMETER, TODAY } from "./terms.fixtures.js";

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
    expect(askedFrom(termsFrom(EVERY_PARAMETER, TODAY), REFERENCE)).toEqual({
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

describe("the key a Query is known by", () => {
  const asked = askedFrom(termsFrom(EVERY_PARAMETER, TODAY), REFERENCE);

  it("is the same for the same Query read twice", () => {
    const again = askedFrom(termsFrom(EVERY_PARAMETER, TODAY), REFERENCE);
    if (asked === null || again === null)
      throw new Error("the query cannot run");

    expect(keyOf(again)).toBe(keyOf(asked));
  });

  it("differs when any one term does", () => {
    if (asked === null) throw new Error("the query cannot run");

    expect(keyOf({ ...asked, partySize: asked.partySize + 1 })).not.toBe(
      keyOf(asked),
    );
  });
});
