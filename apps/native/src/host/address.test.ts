import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import type { SeatGroupResult } from "@seatscout/client";
import { renderHook } from "@testing-library/react-native";
import { first, settled, WARM_UP } from "../../test/rooms.js";

const mockPush = jest.fn<(to: unknown) => void>();
const mockReplace = jest.fn<(to: unknown) => void>();
const mockBack = jest.fn<() => void>();
const mockParams = jest.fn<() => Readonly<Record<string, unknown>>>(() => ({}));

jest.mock("expo-router", () => ({
  router: {
    push: (to: unknown) => mockPush(to),
    replace: (to: unknown) => mockReplace(to),
    back: () => mockBack(),
  },
  useLocalSearchParams: () => mockParams(),
}));

import {
  askAbout,
  askedIn,
  goTo,
  handOff,
  keepAsItWas,
  openRoom,
  pairsOf,
  runInstead,
  useFocus,
  useHanded,
} from "./address.js";

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

  it("reads a list the router carried joined by commas as one pair each, and only a list", () => {
    expect(
      pairsOf({
        date: "2026-09-28,2026-09-30",
        format: "IMAX,Dolby Cinema",
        theater: "aacbt,aaxju",
        amenity: "Recliners,Dine-In",
        movie: "Crazy, Stupid, Love",
      }),
    ).toEqual([
      ["date", "2026-09-28"],
      ["date", "2026-09-30"],
      ["format", "IMAX"],
      ["format", "Dolby Cinema"],
      ["theater", "aacbt"],
      ["theater", "aaxju"],
      ["amenity", "Recliners"],
      ["amenity", "Dine-In"],
      ["movie", "Crazy, Stupid, Love"],
    ]);
    expect(pairsOf({ chain: ["AMC,Landmark"] })).toEqual([
      ["chain", "AMC"],
      ["chain", "Landmark"],
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

describe("opening the Ask sheet over the query it is editing", () => {
  it("carries the Query the sheet edits, and the term it opens at", () => {
    askAbout({ date: "2026-09-19", area: "75234", partySize: 2 }, "movie");

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/ask",
      params: {
        date: "2026-09-19",
        area: "75234",
        partySize: "2",
        term: "movie",
      },
    });
  });

  it("opens focused on either term the sheet has a field for", () => {
    mockParams.mockReturnValue({ term: "movie" });
    expect(useFocus()).toBe("movie");

    mockParams.mockReturnValue({ term: "area" });
    expect(useFocus()).toBe("area");
  });

  it("ignores a term it cannot open focused on, and one nobody named", () => {
    mockParams.mockReturnValue({ term: "profile" });
    expect(useFocus()).toBeUndefined();

    mockParams.mockReturnValue({ term: "nonsense" });
    expect(useFocus()).toBeUndefined();

    mockParams.mockReturnValue({});
    expect(useFocus()).toBeUndefined();
  });
});

describe("opening the Room from a Seat Group", () => {
  it("carries the Query, the showtime and the Seat Group, so the Room reads as a deep link", () => {
    openRoom(
      { date: "2026-09-19", area: "75234", partySize: 2 },
      4102,
      "H13-H14",
    );

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/room",
      params: {
        date: "2026-09-19",
        area: "75234",
        partySize: "2",
        showtime: "4102",
        group: "H13-H14",
      },
    });
  });
});

describe("keeping the query as it was", () => {
  it("goes back one entry, which is the screen the sheet was presented over", () => {
    keepAsItWas();

    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});

describe("the search a Query stated in the sheet runs", () => {
  it("replaces the sheet with the Search screen under the new Query, so back is the query before it", () => {
    runInstead({ movie: "218678", date: "2026-09-19", partySize: 2 });

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/",
      params: { movie: "218678", date: "2026-09-19", partySize: "2" },
    });
  });
});

describe("handing a Seat Group to the hand-off sheet", () => {
  let chosen: SeatGroupResult;

  beforeAll(async () => {
    chosen = first(await settled());
  }, WARM_UP);

  const handed = async (group: string | undefined) => {
    mockParams.mockReturnValue(group === undefined ? {} : { group });
    const read = await renderHook(() => useHanded());
    return read.result.current;
  };

  it("presents the sheet named by the Seat Group's key", () => {
    handOff(chosen);

    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: "/hand-off",
      params: { group: chosen.key },
    });
  });

  it("gives the sheet the Seat Group it was handed, when the route names it", async () => {
    handOff(chosen);

    expect(await handed(chosen.key)).toBe(chosen);
  });

  it("gives it nothing when the route names another, or none", async () => {
    handOff(chosen);

    expect(await handed(`${chosen.key}+`)).toBeUndefined();
    expect(await handed(undefined)).toBeUndefined();
  });
});
