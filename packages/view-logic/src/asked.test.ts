import { REFERENCE } from "@seatscout/client";
import { describe, expect, it } from "vitest";
import { askedFrom } from "./asked.js";
import { EVERY_PARAMETER, TODAY } from "./terms.fixtures.js";
import { type Terms, termsFrom } from "./terms.js";

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
        TODAY,
      ),
    ).toEqual({
      movie: "245569",
      dates: [TODAY],
      area: "75006",
      partySize: 3,
      accessibleSeating: false,
      profile: REFERENCE,
    });
    expect(
      askedFrom(
        { movie: "245569", date: TODAY, partySize: 3 },
        REFERENCE,
        TODAY,
      ),
    ).toBeNull();
    expect(
      askedFrom({ area: "75006", date: TODAY, partySize: 3 }, REFERENCE, TODAY),
    ).toBeNull();
  });

  it("becomes a search carrying every term, with the window as the clock of each day and no term where none was asked", () => {
    expect(
      askedFrom(termsFrom(EVERY_PARAMETER, TODAY), REFERENCE, TODAY),
    ).toEqual({
      movie: "245569",
      dates: ["2026-08-28"],
      area: "75006",
      partySize: 2,
      accessibleSeating: true,
      profile: REFERENCE,
      chains: ["AMC", "Landmark"],
      theaters: ["aacbt", "aaxju"],
      formats: ["Dolby Cinema", "IMAX"],
      amenities: ["Recliners"],
      from: "19:00",
      until: "21:00",
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
          TODAY,
        ) ?? {},
      ).toSorted(),
    ).toEqual([
      "accessibleSeating",
      "area",
      "dates",
      "movie",
      "partySize",
      "profile",
    ]);
  });

  const EVERY_FORM: readonly (readonly [
    Pick<Terms, "date" | "when">,
    readonly string[],
  ])[] = [
    [{ date: "2026-08-29" }, ["2026-08-29"]],
    [
      {
        date: "2026-08-30",
        when: { kind: "range", first: "2026-08-30", last: "2026-09-01" },
      },
      ["2026-08-30", "2026-08-31", "2026-09-01"],
    ],
    [
      { date: TODAY, when: { kind: "any" } },
      [
        "2026-08-28",
        "2026-08-29",
        "2026-08-30",
        "2026-08-31",
        "2026-09-01",
        "2026-09-02",
        "2026-09-03",
      ],
    ],
  ];

  it.each(EVERY_FORM)("asks for every day %o names", (span, dates) => {
    expect(
      askedFrom(
        { movie: "245569", ...span, area: "75006", partySize: 2 },
        REFERENCE,
        TODAY,
      )?.dates,
    ).toEqual(dates);
  });
});
