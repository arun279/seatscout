import { describe, expect, it } from "vitest";
import {
  captured,
  counted,
  everyShowtime,
  theaterNamed,
} from "./catalogue.fixtures.js";
import { type Catalogue, narrowed } from "./catalogue.js";

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
      bookable: 494,
      unbookable: 12,
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
      unidentified: 506,
    });
    expect(counted(narrowed(catalogue, { theaters }))).toEqual({
      ...none,
      unidentified: 50,
    });
    expect(counted(narrowed(catalogue, { formats: ["IMAX"] }))).toEqual({
      ...none,
      unidentified: 18,
    });
    expect(
      counted(narrowed(catalogue, { chains: ["Cinemark Theatres"] })),
    ).toEqual({ ...none, unidentified: 207 });
    expect(counted(narrowed(catalogue, { amenities: ["Dine-In"] }))).toEqual({
      ...none,
      unidentified: 27,
    });
    expect(
      counted(
        narrowed(catalogue, {
          from: "2026-09-20T19:00",
          until: "2026-09-20T22:00",
        }),
      ),
    ).toEqual({ ...none, unidentified: 119 });
  });

  it("narrows to the one Theater a Query names", () => {
    const catalogue = captured();
    expect(
      counted(
        narrowed(catalogue, {
          theaters: [theaterNamed(catalogue, "Cinemark Dallas XD and IMAX")],
        }),
      ),
    ).toEqual({ bookable: 47, unbookable: 0, unidentified: 0 });
  });

  it("narrows the identified Showtimes to the Theaters asked for", () => {
    const catalogue = captured();
    const theaters = [
      theaterNamed(catalogue, "Cinemark Dallas XD and IMAX"),
      theaterNamed(catalogue, "Landmark Inwood Theatre"),
    ];
    const kept = narrowed(catalogue, { theaters });

    expect(counted(kept)).toEqual({
      bookable: 47,
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
    ).toEqual({ bookable: 207, unbookable: 0, unidentified: 0 });
    expect(
      counted(narrowed(catalogue, { chains: ["AMC", "Landmark"] })),
    ).toEqual({ bookable: 79, unbookable: 3, unidentified: 0 });
    expect(
      everyShowtime(catalogue).filter(
        (showtime) => showtime.presentation.theater.chain === undefined,
      ),
    ).toHaveLength(33);
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
      bookable: 27,
      unbookable: 0,
      unidentified: 0,
    });
    expect(
      counted(narrowed(catalogue, { amenities: ["Closed Captioning"] })),
    ).toEqual({ bookable: 105, unbookable: 0, unidentified: 0 });
    expect(
      counted(
        narrowed(catalogue, { amenities: ["Dine-In", "Closed Captioning"] }),
      ),
    ).toEqual({ bookable: 132, unbookable: 0, unidentified: 0 });
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
      bookable: 18,
      unbookable: 0,
      unidentified: 0,
    });
    expect(counted(narrowed(catalogue, { formats: ["ScreenX"] }))).toEqual({
      bookable: 13,
      unbookable: 0,
      unidentified: 0,
    });
    expect(
      counted(narrowed(catalogue, { formats: ["IMAX", "ScreenX"] })),
    ).toEqual({ bookable: 31, unbookable: 0, unidentified: 0 });
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
      { bookable: 24, unbookable: 0, unidentified: 0 },
    );
    expect(
      counted(
        narrowed(catalogue, {
          theaters,
          formats: ["XD"],
          until: "2026-09-20T20:00",
        }),
      ),
    ).toEqual({ bookable: 16, unbookable: 0, unidentified: 0 });
    expect(
      counted(
        narrowed(catalogue, {
          chains: ["Cinemark Theatres"],
          amenities: ["Recliners"],
        }),
      ),
    ).toEqual({ bookable: 183, unbookable: 0, unidentified: 0 });
  });
});
