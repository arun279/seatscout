import { describe, expect, it, jest } from "@jest/globals";

const mockPush = jest.fn<(to: unknown) => void>();

jest.mock("expo-router", () => ({
  router: { push: (to: unknown) => mockPush(to) },
  useLocalSearchParams: () => ({}),
}));

import { askedIn, goTo, pairsOf } from "./address.js";

describe("the route's parameters read as a list of pairs", () => {
  it("reads a parameter given once", () => {
    expect(pairsOf({ area: "75234" })).toEqual([["area", "75234"]]);
  });

  it("reads a parameter given more than once as one pair each", () => {
    expect(pairsOf({ format: ["IMAX", "Dolby Cinema"] })).toEqual([
      ["format", "IMAX"],
      ["format", "Dolby Cinema"],
    ]);
  });

  it("reads a parameter the router left out as no pair at all", () => {
    expect(pairsOf({ movie: undefined, area: "75234" })).toEqual([
      ["area", "75234"],
    ]);
  });

  it("keeps every parameter the router carried", () => {
    expect(pairsOf({ area: "75234", partySize: "2" })).toEqual([
      ["area", "75234"],
      ["partySize", "2"],
    ]);
  });
});

describe("a Query written back into the route's parameters", () => {
  it("writes the terms a search always has", () => {
    expect(askedIn({ date: "2026-09-19", partySize: 2 })).toEqual({
      date: "2026-09-19",
      partySize: "2",
    });
  });

  it("writes a term that can be named twice as a list", () => {
    expect(
      askedIn({
        date: "2026-09-19",
        partySize: 2,
        formats: ["IMAX", "Dolby Cinema"],
      }),
    ).toMatchObject({ format: ["IMAX", "Dolby Cinema"] });
  });

  it("writes a term named three times as a list of three", () => {
    expect(
      askedIn({
        date: "2026-09-19",
        partySize: 2,
        amenities: ["Recliners", "Dine-In", "Closed Captioning"],
      }),
    ).toMatchObject({ amenity: ["Recliners", "Dine-In", "Closed Captioning"] });
  });

  it("writes a term named once as a value rather than a list", () => {
    expect(
      askedIn({ date: "2026-09-19", partySize: 2, chains: ["AMC"] }),
    ).toMatchObject({ chain: "AMC" });
  });

  it("carries a whole query out and back unchanged", () => {
    const terms = {
      movie: "218678",
      date: "2026-09-19",
      area: "75234",
      partySize: 4,
      formats: ["IMAX", "Dolby Cinema"] as const,
      from: "19:00",
      until: "22:30",
      accessibleSeating: true,
    };

    expect(pairsOf(askedIn(terms)).map(([name]) => name)).toEqual([
      "movie",
      "date",
      "area",
      "partySize",
      "format",
      "format",
      "from",
      "until",
      "accessibleSeating",
    ]);
  });
});

describe("running a search the phone remembers", () => {
  it("puts the whole Query in the route's parameters and goes to the Search screen", () => {
    goTo({ movie: "218678", date: "2026-09-19", area: "75234", partySize: 4 });

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/",
      params: {
        movie: "218678",
        date: "2026-09-19",
        area: "75234",
        partySize: "4",
      },
    });
  });
});
