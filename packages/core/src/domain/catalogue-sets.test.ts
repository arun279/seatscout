import { describe, expect, expectTypeOf, it } from "vitest";
import {
  type Amenity,
  type Chain,
  EVERY_AMENITY,
  EVERY_CHAIN,
  EVERY_FORMAT,
  type Format,
} from "./catalogue.js";
import { captured, everyShowtime } from "./catalogue.fixtures.js";

describe("the closed sets a Query names", () => {
  it("lists every Format, Amenity and Chain once each and in order, so a screen can offer them", () => {
    expectTypeOf<(typeof EVERY_FORMAT)[number]>().toEqualTypeOf<Format>();
    expectTypeOf<(typeof EVERY_AMENITY)[number]>().toEqualTypeOf<Amenity>();
    expectTypeOf<(typeof EVERY_CHAIN)[number]>().toEqualTypeOf<Chain>();

    expect(new Set(EVERY_FORMAT).size).toBe(15);
    expect(new Set(EVERY_AMENITY).size).toBe(4);
    expect(new Set(EVERY_CHAIN).size).toBe(9);
    for (const listed of [EVERY_FORMAT, EVERY_AMENITY, EVERY_CHAIN])
      expect([...listed]).toEqual([...listed].toSorted());
  });

  it("holds everything the captured listing yields", () => {
    const listed = everyShowtime(captured());

    expect(
      listed
        .flatMap((showtime) => showtime.presentation.formats)
        .filter((format) => !EVERY_FORMAT.includes(format)),
    ).toEqual([]);
    expect(
      listed
        .flatMap((showtime) => showtime.presentation.amenities)
        .filter((amenity) => !EVERY_AMENITY.includes(amenity)),
    ).toEqual([]);
    expect(
      listed
        .flatMap((showtime) => showtime.presentation.theater.chain ?? [])
        .filter((chain) => !EVERY_CHAIN.includes(chain)),
    ).toEqual([]);
  });
});
