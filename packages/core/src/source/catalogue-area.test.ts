import { describe, expect, it } from "vitest";
import {
  nearbyTheatersCaptures,
  showtimeGroupingCaptures,
} from "../corpus/captures.js";
import {
  AREA,
  answering,
  asTheSourceAnsweredIt,
  catalogueOf,
  everyShowtime,
  GROUPINGS,
  groupingCapture,
  instead,
  type Named,
  NEARBY,
  nearbyCapture,
  payloadOf,
  readingOf,
  sourced,
  TODAY,
  WIDE_RELEASE,
  without,
} from "./catalogue.fixtures.js";

const namedIn = (value: unknown, under: string | null): readonly Named[] => {
  if (Array.isArray(value))
    return value.flatMap((item) => namedIn(item, under));
  if (value === null || typeof value !== "object")
    return under === null ? [] : [[under, value]];
  return Object.entries(value).flatMap(([key, nested]): readonly Named[] => [
    [key, nested],
    ...namedIn(nested, key),
  ]);
};

const keysIn = (value: unknown) => namedIn(value, null).map(([key]) => key);

const stringsUnder = (value: unknown, names: readonly string[]) =>
  namedIn(value, null).flatMap(([key, nested]) =>
    names.includes(key) && typeof nested === "string" ? [nested] : [],
  );

describe("the catalogue's areas, Theaters and Chains", () => {
  it("turns an area into Theaters", async () => {
    const reading = await sourced().theatersNear(AREA);

    expect(payloadOf(reading)).toEqual(
      nearbyCapture().theaters.map((theater) => ({
        id: theater.formattedID,
        name: theater.name,
        chain: theater.chainName,
      })),
    );
  });

  it("refuses a whole area that is missing anything a Theater is built from", async () => {
    const fields = ["formattedID", "name", "theaters"];
    const refused: string[] = [];
    for (const field of fields) {
      const reading = await sourced(
        answering(NEARBY, without(nearbyCapture(), field)),
      ).theatersNear(AREA);
      if (!reading.ok) refused.push(field);
    }

    expect(refused).toEqual(fields);
  });

  it("answers an area whose Theaters carry no chain code, and refuses one whose code is not one", async () => {
    const area = async (body: unknown) =>
      sourced(answering(NEARBY, body)).theatersNear(AREA);
    const unnamed = payloadOf(
      await area(without(nearbyCapture(), "chainCode")),
    );
    const codes: readonly unknown[] = [1, null, true];
    const refused: unknown[] = [];
    for (const code of codes)
      if (!(await area(instead(nearbyCapture(), "chainCode", code))).ok)
        refused.push(code);

    expect(unnamed).toHaveLength(25);
    expect(
      [
        ...new Set(unnamed.flatMap((theater) => Object.keys(theater))),
      ].toSorted(),
    ).toEqual(["id", "name"]);
    expect(refused).toEqual(codes);
  });

  it("gives a Theater one identity and one Chain whichever way it is reached", async () => {
    const discovered = payloadOf(await sourced().theatersNear(AREA));
    const catalogue = await catalogueOf(WIDE_RELEASE, TODAY);
    const listed = new Map(
      everyShowtime(catalogue).map((showtime) => [
        showtime.presentation.theater.name,
        showtime.presentation.theater,
      ]),
    );
    const shared = discovered.filter((theater) => listed.has(theater.name));

    expect(shared.length).toBeGreaterThanOrEqual(24);
    expect(shared).toEqual(shared.map((theater) => listed.get(theater.name)));
  });

  it("names a Chain as the Source itself names it, and names none where the Source never has", async () => {
    const discovery = nearbyCapture().theaters;
    const stated = new Map(
      discovery.map((theater) => [theater.chainCode, theater.chainName]),
    );
    const listed = groupingCapture(WIDE_RELEASE, TODAY).theaterShowtimes
      .theaters;
    const chained = new Map<string, string | undefined>(
      everyShowtime(await catalogueOf(WIDE_RELEASE, TODAY)).map((showtime) => [
        showtime.presentation.theater.id,
        showtime.presentation.theater.chain,
      ]),
    );

    expect(stated.size).toBe(9);
    expect(new Set(listed.map((theater) => theater.chainCode)).size).toBe(12);
    expect(listed.map((theater) => chained.get(theater.formattedID))).toEqual(
      listed.map((theater) => stated.get(theater.chainCode)),
    );
    expect(
      [
        ...new Set(
          listed.flatMap((theater) =>
            stated.has(theater.chainCode) ? [] : [theater.chainCode],
          ),
        ),
      ].toSorted(),
    ).toEqual(["FLIX", "REGL", "VZ"]);
  });

  it("answers a listing whose Theaters carry no chain code, and refuses one whose code is not one", async () => {
    const capture = groupingCapture(WIDE_RELEASE, TODAY);
    const unnamed = payloadOf(await readingOf(without(capture, "chainCode")));
    const codes: readonly unknown[] = [1, null, true];
    const refused: unknown[] = [];
    for (const code of codes)
      if (!(await readingOf(instead(capture, "chainCode", code))).ok)
        refused.push(code);

    expect(unnamed.bookable).toHaveLength(172);
    expect(
      [
        ...new Set(
          everyShowtime(unnamed).flatMap((showtime) =>
            Object.keys(showtime.presentation.theater),
          ),
        ),
      ].toSorted(),
    ).toEqual(["id", "name"]);
    expect(refused).toEqual(codes);
  });

  it("names the Formats it recognises and says nothing about the rest", async () => {
    const tally = new Map<string, number>();
    for (const [movie, date] of GROUPINGS)
      for (const showtime of everyShowtime(await catalogueOf(movie, date))) {
        const formats = showtime.presentation.formats.join("+");
        tally.set(formats, (tally.get(formats) ?? 0) + 1);
      }

    expect(Object.fromEntries(tally)).toEqual({
      "": 496,
      "3D": 4,
      "3D+D-BOX+XD": 3,
      "3D+Laser": 4,
      "3D+XD": 4,
      "D-BOX": 45,
      "D-BOX+DFX": 5,
      "D-BOX+XD": 40,
      DFX: 5,
      "Dolby Atmos+HDR by Barco": 4,
      "Dolby Atmos+The Big Show": 4,
      "Dolby Cinema": 19,
      "IMAX+IMAX with Laser": 2,
      Laser: 99,
      "Laser+ScreenX": 4,
      SDX: 13,
      ScreenX: 4,
      "Sony Digital": 4,
      XD: 53,
      XL: 12,
    });
  });

  it("names the Amenities it recognises and says nothing about the rest", async () => {
    const tally = new Map<string, number>();
    for (const [movie, date] of GROUPINGS)
      for (const showtime of everyShowtime(await catalogueOf(movie, date))) {
        const amenities = showtime.presentation.amenities.join("+");
        tally.set(amenities, (tally.get(amenities) ?? 0) + 1);
      }

    expect(Object.fromEntries(tally)).toEqual({
      "": 157,
      "Accessibility Devices": 43,
      "Accessibility Devices+Closed Captioning": 84,
      "Accessibility Devices+Closed Captioning+Recliners": 110,
      "Accessibility Devices+Dine-In+Recliners": 61,
      "Accessibility Devices+Recliners": 41,
      "Closed Captioning+Recliners": 13,
      Recliners: 315,
    });
  });

  it("takes no amenity label for both a Format and an Amenity, and takes neither from one nobody classified", async () => {
    const capture = groupingCapture(WIDE_RELEASE, TODAY);
    const carried = async (label: string) => {
      const [showtime] = everyShowtime(
        payloadOf(
          await readingOf(instead(capture, "amenities", [{ name: label }])),
        ),
      );
      return {
        formats: showtime?.presentation.formats,
        amenities: showtime?.presentation.amenities,
      };
    };

    expect(await carried("Cinemark XD")).toEqual({
      formats: ["XD"],
      amenities: [],
    });
    expect(await carried("Recliner Seats")).toEqual({
      formats: [],
      amenities: ["Recliners"],
    });
    expect(await carried("Reserved seating")).toEqual({
      formats: [],
      amenities: [],
    });
    expect(await carried("a label nobody has classified")).toEqual({
      formats: [],
      amenities: [],
    });
  });

  it("carries no upstream field name and no upstream code out of the adapter", async () => {
    const captures = [
      ...showtimeGroupingCaptures.values(),
      ...nearbyTheatersCaptures.values(),
    ].map((capture) => capture.body);
    const upstream = new Set(captures.flatMap(keysIn));
    const codes = new Set(
      captures.flatMap((body) => stringsUnder(body, ["chainCode", "type"])),
    );
    const named = new Set(
      captures.flatMap((body) => stringsUnder(body, ["chainName"])),
    );
    const domain = [
      await sourced().showtimesFor(WIDE_RELEASE, TODAY, AREA),
      await readingOf(asTheSourceAnsweredIt()),
      await sourced().theatersNear(AREA),
    ];

    expect(codes.size).toBeGreaterThanOrEqual(15);
    expect([...codes].filter((code) => named.has(code))).toEqual(["AMC"]);
    expect(
      [...new Set(domain.flatMap(keysIn))]
        .filter((key) => upstream.has(key))
        .toSorted(),
    ).toEqual(["amenities", "formats", "id", "name"]);
    expect(
      domain
        .flatMap((reading) => namedIn(reading, null))
        .flatMap(([, value]) => (typeof value === "string" ? [value] : []))
        .filter((value) => codes.has(value) && !named.has(value)),
    ).toEqual([]);
  });
});
