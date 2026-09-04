import { describe, expect, it } from "vitest";
import { type Catalogue, narrowed } from "./catalogue.js";
import {
  captured,
  counted,
  everyShowtime,
  theaterNamed,
} from "./catalogue.fixtures.js";

const asUnidentified = (catalogue: Catalogue): Catalogue => ({
  bookable: [],
  unbookable: [],
  unidentified: everyShowtime(catalogue).map(
    ({ startsAt, presentation, ticketing }) => ({
      startsAt,
      presentation,
      ticketing,
    }),
  ),
});

describe("narrowing a catalogue", () => {
  it("admits every Showtime when nothing narrows it", () => {
    const catalogue = captured();

    expect(counted(catalogue)).toEqual({
      bookable: 172,
      unbookable: 4,
      unidentified: 0,
    });
    expect(narrowed(catalogue, {})).toEqual(catalogue);
  });

  it("narrows the Showtimes it could not identify by the terms it narrows the rest by", () => {
    const identified = captured();
    const catalogue = asUnidentified(identified);
    const theaters = [
      theaterNamed(identified, "Cinemark Dallas XD and IMAX"),
      theaterNamed(identified, "Landmark Inwood Theatre"),
    ];

    const none = { bookable: 0, unbookable: 0 };

    expect(counted(narrowed(catalogue, {}))).toEqual({
      ...none,
      unidentified: 176,
    });
    expect(counted(narrowed(catalogue, { theaters }))).toEqual({
      ...none,
      unidentified: 17,
    });
    expect(counted(narrowed(catalogue, { formats: ["IMAX"] }))).toEqual({
      ...none,
      unidentified: 1,
    });
    expect(
      counted(narrowed(catalogue, { chains: ["Cinemark Theatres"] })),
    ).toEqual({ ...none, unidentified: 63 });
    expect(counted(narrowed(catalogue, { amenities: ["Dine-In"] }))).toEqual({
      ...none,
      unidentified: 16,
    });
    expect(
      counted(
        narrowed(catalogue, {
          from: "2026-08-28T19:00",
          until: "2026-08-28T22:00",
        }),
      ),
    ).toEqual({ ...none, unidentified: 46 });
  });

  it("narrows to a Theater named by the string an address carries", () => {
    expect(counted(narrowed(captured(), { theaters: ["aacbt"] }))).toEqual({
      bookable: 14,
      unbookable: 0,
      unidentified: 0,
    });
  });

  it("narrows the identified Showtimes to the Theaters asked for", () => {
    const catalogue = captured();
    const theaters = [
      theaterNamed(catalogue, "Cinemark Dallas XD and IMAX"),
      theaterNamed(catalogue, "Landmark Inwood Theatre"),
    ];
    const kept = narrowed(catalogue, { theaters });

    expect(counted(kept)).toEqual({
      bookable: 14,
      unbookable: 3,
      unidentified: 0,
    });
    expect(
      everyShowtime(kept).every((showtime) =>
        theaters.includes(showtime.presentation.theater.id),
      ),
    ).toBe(true);
  });

  it("admits nothing when the Theaters asked for are none", () => {
    expect(counted(narrowed(captured(), { theaters: [] }))).toEqual({
      bookable: 0,
      unbookable: 0,
      unidentified: 0,
    });
  });

  it("narrows to the Chains asked for, and admits no Theater the Source has never named one for", () => {
    const catalogue = captured();

    expect(
      counted(narrowed(catalogue, { chains: ["Cinemark Theatres"] })),
    ).toEqual({ bookable: 63, unbookable: 0, unidentified: 0 });
    expect(
      counted(narrowed(catalogue, { chains: ["AMC", "Landmark"] })),
    ).toEqual({ bookable: 26, unbookable: 4, unidentified: 0 });
    expect(
      everyShowtime(catalogue).filter(
        (showtime) => showtime.presentation.theater.chain === undefined,
      ),
    ).toHaveLength(17);
  });

  it("admits nothing when the Chains asked for are none", () => {
    expect(counted(narrowed(captured(), { chains: [] }))).toEqual({
      bookable: 0,
      unbookable: 0,
      unidentified: 0,
    });
  });

  it("admits a Showtime carrying any one of the Amenities asked for", () => {
    const catalogue = captured();

    expect(counted(narrowed(catalogue, { amenities: ["Dine-In"] }))).toEqual({
      bookable: 16,
      unbookable: 0,
      unidentified: 0,
    });
    expect(
      counted(narrowed(catalogue, { amenities: ["Closed Captioning"] })),
    ).toEqual({ bookable: 43, unbookable: 1, unidentified: 0 });
    expect(
      counted(
        narrowed(catalogue, { amenities: ["Dine-In", "Closed Captioning"] }),
      ),
    ).toEqual({ bookable: 59, unbookable: 1, unidentified: 0 });
  });

  it("admits nothing when the Amenities asked for are none", () => {
    expect(counted(narrowed(captured(), { amenities: [] }))).toEqual({
      bookable: 0,
      unbookable: 0,
      unidentified: 0,
    });
  });

  it("admits a Showtime carrying any one of the Formats asked for", () => {
    const catalogue = captured();

    expect(counted(narrowed(catalogue, { formats: ["IMAX"] }))).toEqual({
      bookable: 1,
      unbookable: 0,
      unidentified: 0,
    });
    expect(counted(narrowed(catalogue, { formats: ["ScreenX"] }))).toEqual({
      bookable: 2,
      unbookable: 0,
      unidentified: 0,
    });
    expect(
      counted(narrowed(catalogue, { formats: ["IMAX", "ScreenX"] })),
    ).toEqual({ bookable: 3, unbookable: 0, unidentified: 0 });
  });

  it("admits nothing when the Formats asked for are none", () => {
    expect(counted(narrowed(captured(), { formats: [] }))).toEqual({
      bookable: 0,
      unbookable: 0,
      unidentified: 0,
    });
  });

  it("applies every term it was given at once", () => {
    const catalogue = captured();
    const theaters = [theaterNamed(catalogue, "Cinemark Dallas XD and IMAX")];

    expect(counted(narrowed(catalogue, { theaters, formats: ["XD"] }))).toEqual(
      { bookable: 4, unbookable: 0, unidentified: 0 },
    );
    expect(
      counted(
        narrowed(catalogue, {
          theaters,
          formats: ["XD"],
          until: "2026-08-28T20:00",
        }),
      ),
    ).toEqual({ bookable: 2, unbookable: 0, unidentified: 0 });
    expect(
      counted(
        narrowed(catalogue, {
          chains: ["Cinemark Theatres"],
          amenities: ["Recliners"],
        }),
      ),
    ).toEqual({ bookable: 57, unbookable: 0, unidentified: 0 });
  });
});
