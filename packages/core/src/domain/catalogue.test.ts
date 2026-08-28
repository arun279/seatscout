import { describe, expect, it } from "vitest";
import { showtimeGroupingCaptures } from "../corpus/captures.js";
import { catalogueFrom } from "../source/catalogue.js";
import {
  type Catalogue,
  narrowed,
  type Showtime,
  type TheaterId,
} from "./catalogue.js";

const CAPTURE = "showtimes/grouping-245569-2026-08-28.json";

const captured = (): Catalogue => {
  const capture = showtimeGroupingCaptures.get(CAPTURE);
  if (capture === undefined) throw new Error(`${CAPTURE} was never captured`);
  const catalogue = catalogueFrom(JSON.stringify(capture.body));
  if (catalogue === null) throw new Error(`${CAPTURE} did not parse`);
  return catalogue;
};

const everyShowtime = (catalogue: Catalogue): readonly Showtime[] => [
  ...catalogue.bookable,
  ...catalogue.unbookable.map((entry) => entry.showtime),
];

const counted = (catalogue: Catalogue) => ({
  bookable: catalogue.bookable.length,
  unbookable: catalogue.unbookable.length,
});

const theaterNamed = (catalogue: Catalogue, name: string): TheaterId => {
  const theater = everyShowtime(catalogue).find(
    (showtime) => showtime.presentation.theater.name === name,
  );
  if (theater === undefined) throw new Error(`${name} is not in this capture`);
  return theater.presentation.theater.id;
};

const startsAt = (catalogue: Catalogue): readonly number[] =>
  everyShowtime(catalogue)
    .map((showtime) => Date.parse(showtime.startsAt))
    .toSorted((first, second) => first - second);

describe("narrowing a catalogue", () => {
  it("admits every Showtime when nothing narrows it", () => {
    const catalogue = captured();

    expect(counted(catalogue)).toEqual({ bookable: 172, unbookable: 4 });
    expect(narrowed(catalogue, {})).toEqual(catalogue);
  });

  it("narrows both halves of the catalogue to the Theaters asked for", () => {
    const catalogue = captured();
    const theaters = [
      theaterNamed(catalogue, "Cinemark Dallas XD and IMAX"),
      theaterNamed(catalogue, "Landmark Inwood Theatre"),
    ];
    const kept = narrowed(catalogue, { theaters });

    expect(counted(kept)).toEqual({ bookable: 14, unbookable: 3 });
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
    });
  });

  it("admits a Showtime carrying any one of the Formats asked for", () => {
    const catalogue = captured();

    expect(counted(narrowed(catalogue, { formats: ["IMAX"] }))).toEqual({
      bookable: 1,
      unbookable: 0,
    });
    expect(counted(narrowed(catalogue, { formats: ["ScreenX"] }))).toEqual({
      bookable: 2,
      unbookable: 0,
    });
    expect(
      counted(narrowed(catalogue, { formats: ["IMAX", "ScreenX"] })),
    ).toEqual({ bookable: 3, unbookable: 0 });
  });

  it("admits nothing when the Formats asked for are none", () => {
    expect(counted(narrowed(captured(), { formats: [] }))).toEqual({
      bookable: 0,
      unbookable: 0,
    });
  });

  it("keeps a Showtime that starts at the opening of the window and drops one that starts at its close", () => {
    const catalogue = captured();
    const times = startsAt(catalogue);
    const opening = times[0];
    const close = times.at(-1);
    if (opening === undefined || close === undefined)
      throw new Error("the capture holds no Showtimes");

    expect(counted(narrowed(catalogue, { from: opening }))).toEqual({
      bookable: 172,
      unbookable: 4,
    });
    expect(counted(narrowed(catalogue, { from: opening + 1 }))).toEqual({
      bookable: 171,
      unbookable: 4,
    });
    expect(counted(narrowed(catalogue, { until: close }))).toEqual({
      bookable: 171,
      unbookable: 4,
    });
    expect(counted(narrowed(catalogue, { until: close + 1 }))).toEqual({
      bookable: 172,
      unbookable: 4,
    });
  });

  it("narrows to an evening window across every Theater at once", () => {
    const catalogue = captured();
    const kept = narrowed(catalogue, {
      from: Date.parse("2026-08-28T19:00:00-05:00"),
      until: Date.parse("2026-08-28T22:00:00-05:00"),
    });

    expect(counted(kept)).toEqual({ bookable: 46, unbookable: 0 });
  });

  it("applies every term it was given at once", () => {
    const catalogue = captured();
    const theaters = [theaterNamed(catalogue, "Cinemark Dallas XD and IMAX")];

    expect(counted(narrowed(catalogue, { theaters, formats: ["XD"] }))).toEqual(
      {
        bookable: 4,
        unbookable: 0,
      },
    );
    expect(
      counted(
        narrowed(catalogue, {
          theaters,
          formats: ["XD"],
          until: Date.parse("2026-08-28T20:00:00-05:00"),
        }),
      ),
    ).toEqual({ bookable: 2, unbookable: 0 });
  });
});
