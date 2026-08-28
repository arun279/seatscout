import { describe, expect, expectTypeOf, it } from "vitest";
import {
  nearbyTheatersCaptures,
  showtimeGroupingCaptures,
} from "../corpus/captures.js";
import type { CapturedShowtimeGrouping } from "../corpus/types.js";
import type {
  Catalogue,
  Showtime,
  TicketingUrl,
  UnbookableReason,
} from "../domain/catalogue.js";
import { type UpstreamScript, fakeUpstream } from "../testing/fake-upstream.js";
import { openSource } from "./aggregator.js";
import type { Reading, Source } from "./port.js";

const BOOTSTRAP = "/napi/preferences/themes";
const NEARBY = "/napi/nearbyTheaters";
const AREA = "75006";
const TODAY = "2026-08-28";
const WIDE_RELEASE = "245569";
const GROUPINGS = [
  ["243819", TODAY],
  [WIDE_RELEASE, "2026-08-27"],
  [WIDE_RELEASE, TODAY],
  ["246329", TODAY],
  ["246427", TODAY],
] as const;

const sourced = (script: Omit<UpstreamScript, "seed"> = {}): Source =>
  openSource({
    fetch: fakeUpstream({
      seed: 4,
      ...script,
      routes: { [BOOTSTRAP]: { status: 200, body: "{}" }, ...script.routes },
    }),
    now: () => 1000,
    wait: () => Promise.resolve(),
    random: () => 0.5,
  });

const payloadOf = <Found>(reading: Reading<Found>): Found => {
  if (!reading.ok) throw new Error(`the Source answered ${reading.reason}`);
  return reading.payload;
};

const catalogueOf = async (movie: string, date: string): Promise<Catalogue> =>
  payloadOf(await sourced().showtimesFor(movie, date, AREA));

const everyShowtime = (catalogue: Catalogue): readonly Showtime[] => [
  ...catalogue.bookable,
  ...catalogue.unbookable.map((entry) => entry.showtime),
];

const counted = (catalogue: Catalogue, reason: UnbookableReason) =>
  catalogue.unbookable.filter((entry) => entry.reason === reason).length;

const grouping = (movie: string, date: string) =>
  `/napi/theaterShowtimeGroupings/${movie}/${date}`;

const groupingCapture = (movie: string, date: string) => {
  const capture = showtimeGroupingCaptures.get(
    `showtimes/grouping-${movie}-${date}.json`,
  );
  if (capture === undefined)
    throw new Error(`${movie} on ${date} was never captured`);
  return capture.body;
};

const nearbyCapture = () => {
  const capture = nearbyTheatersCaptures.get("theaters/nearby-theaters.json");
  if (capture === undefined)
    throw new Error("nearby theaters were not captured");
  return capture.body;
};

type CapturedTheaters =
  CapturedShowtimeGrouping["theaterShowtimes"]["theaters"];

const capturedRows = (theaters: CapturedTheaters) =>
  theaters.flatMap((theater) =>
    theater.variants.flatMap((variant) =>
      variant.amenityGroups.flatMap((group) => group.showtimes),
    ),
  );

type Named = readonly [string, unknown];

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

const rewritten = (
  value: unknown,
  change: (entry: Named) => readonly Named[],
): unknown => {
  if (Array.isArray(value)) return value.map((item) => rewritten(item, change));
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, nested]) =>
      change([key, rewritten(nested, change)]),
    ),
  );
};

const without = (value: unknown, field: string) =>
  rewritten(value, ([key, nested]) => (key === field ? [] : [[key, nested]]));

const instead = (value: unknown, field: string, to: unknown) =>
  rewritten(value, ([key, nested]) => [[key, key === field ? to : nested]]);

const alongside = (value: unknown, field: string, item: unknown) =>
  rewritten(value, ([key, nested]) => [
    [key, key === field && Array.isArray(nested) ? [...nested, item] : nested],
  ]);

const answering = (route: string, body: unknown) => ({
  routes: { [route]: { status: 200, body: JSON.stringify(body) } },
});

describe("the catalogue", () => {
  it("turns a Movie, a date and an area into Showtimes in domain vocabulary", async () => {
    const theaters = groupingCapture(WIDE_RELEASE, TODAY).theaterShowtimes
      .theaters;
    const first = capturedRows(theaters)[0];
    const catalogue = await catalogueOf(WIDE_RELEASE, TODAY);

    expect(first).toBeDefined();
    expect(catalogue.bookable[0]).toEqual({
      id: first?.id,
      startsAt: "2026-08-28T19:20:00-05:00",
      presentation: {
        movie: WIDE_RELEASE,
        theater: {
          id: theaters[0]?.formattedID,
          name: "Cinemark Dallas XD and IMAX",
        },
        formats: ["D-BOX", "XD"],
      },
      ticketing: first?.ticketingJumpPageURL,
    });
  });

  it("carries the ticketing URL the Source supplied rather than one of its own", async () => {
    const supplied = capturedRows(
      groupingCapture(WIDE_RELEASE, TODAY).theaterShowtimes.theaters,
    ).map((row) => row.ticketingJumpPageURL);
    const catalogue = await catalogueOf(WIDE_RELEASE, TODAY);

    expect(supplied.length).toBeGreaterThanOrEqual(176);
    expect(
      everyShowtime(catalogue)
        .map((showtime) => showtime.ticketing)
        .toSorted(),
    ).toEqual(supplied.toSorted());
  });

  it("cannot be handed a ticketing URL that was assembled from parts", () => {
    expectTypeOf<string>().not.toExtend<TicketingUrl>();
    expectTypeOf<TicketingUrl>().toExtend<string>();
  });

  it("separates the bookable Showtimes from the ones it names a reason for", async () => {
    const catalogue = await catalogueOf(WIDE_RELEASE, TODAY);

    expect({
      bookable: catalogue.bookable.length,
      noSeatMap: counted(catalogue, "noSeatMap"),
      started: counted(catalogue, "started"),
      soldOut: counted(catalogue, "soldOut"),
    }).toEqual({ bookable: 172, noSeatMap: 3, started: 0, soldOut: 1 });
  });

  it("does not call a Showtime bookable because the Source calls it available", async () => {
    const inwood = groupingCapture(
      WIDE_RELEASE,
      TODAY,
    ).theaterShowtimes.theaters.filter(
      (theater) => theater.name === "Landmark Inwood Theatre",
    );
    const catalogue = await catalogueOf(WIDE_RELEASE, TODAY);
    const named = catalogue.unbookable.filter(
      (entry) =>
        entry.showtime.presentation.theater.name === "Landmark Inwood Theatre",
    );

    expect(
      capturedRows(inwood).map((row) => [row.type, row.expired, row.isSoldOut]),
    ).toEqual([
      ["available", false, false],
      ["available", false, false],
      ["available", false, false],
    ]);
    expect(named.map((entry) => entry.reason)).toEqual([
      "noSeatMap",
      "noSeatMap",
      "noSeatMap",
    ]);
    expect(
      catalogue.bookable.filter(
        (showtime) =>
          showtime.presentation.theater.name === "Landmark Inwood Theatre",
      ),
    ).toEqual([]);
  });

  it("prefers the reason that outlives the screening when more than one applies", async () => {
    const yesterday = "2026-08-27";
    const past = await catalogueOf(WIDE_RELEASE, yesterday);
    const alsoSoldOut = payloadOf(
      await sourced(
        answering(
          grouping(WIDE_RELEASE, yesterday),
          instead(groupingCapture(WIDE_RELEASE, yesterday), "isSoldOut", true),
        ),
      ).showtimesFor(WIDE_RELEASE, yesterday, AREA),
    );
    const tally = (catalogue: Catalogue) => ({
      bookable: catalogue.bookable.length,
      noSeatMap: counted(catalogue, "noSeatMap"),
      started: counted(catalogue, "started"),
      soldOut: counted(catalogue, "soldOut"),
    });

    expect(tally(past)).toEqual({
      bookable: 0,
      noSeatMap: 3,
      started: 77,
      soldOut: 0,
    });
    expect(tally(alsoSoldOut)).toEqual(tally(past));
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

  it("refuses a whole listing that is missing anything a Showtime is built from", async () => {
    const capture = groupingCapture(WIDE_RELEASE, TODAY);
    const route = grouping(WIDE_RELEASE, TODAY);
    const fields = [
      "amenities",
      "amenityGroups",
      "dateLocal",
      "expired",
      "formattedID",
      "hasReservedSeating",
      "id",
      "isSoldOut",
      "movieID",
      "name",
      "showtimes",
      "theaterShowtimes",
      "theaters",
      "ticketingJumpPageURL",
      "variants",
    ];
    const refused: string[] = [];
    for (const field of fields) {
      const reading = await sourced(
        answering(route, without(capture, field)),
      ).showtimesFor(WIDE_RELEASE, TODAY, AREA);
      if (!reading.ok) refused.push(field);
    }

    expect(refused).toEqual(fields);
  });

  it("refuses a whole listing that carries one part it cannot read", async () => {
    const capture = groupingCapture(WIDE_RELEASE, TODAY);
    const route = grouping(WIDE_RELEASE, TODAY);
    const arrays = [
      "amenities",
      "amenityGroups",
      "showtimes",
      "theaters",
      "variants",
    ];
    const refused: string[] = [];
    for (const key of arrays) {
      const reading = await sourced(
        answering(route, alongside(capture, key, {})),
      ).showtimesFor(WIDE_RELEASE, TODAY, AREA);
      if (!reading.ok) refused.push(key);
    }

    expect(refused).toEqual(arrays);
  });

  it("refuses a whole area that carries one Theater it cannot read", async () => {
    const reading = await sourced(
      answering(NEARBY, alongside(nearbyCapture(), "theaters", {})),
    ).theatersNear(AREA);

    expect(reading.ok).toBe(false);
  });

  it("reports an area it could not decode rather than raising", async () => {
    const reading = await sourced({
      routes: { [NEARBY]: { status: 200, body: "<html>not today</html>" } },
    }).theatersNear(AREA);

    expect(reading).toEqual({
      ok: false,
      reason: "unreachable",
      fetchedAt: 1000,
      attempts: 3,
    });
  });

  it("reads a listing that is whole", async () => {
    const reading = await sourced(
      answering(
        grouping(WIDE_RELEASE, TODAY),
        without(groupingCapture(WIDE_RELEASE, TODAY), "amenityString"),
      ),
    ).showtimesFor(WIDE_RELEASE, TODAY, AREA);

    expect(payloadOf(reading).bookable).toHaveLength(172);
  });

  it("reports a Source it could not read rather than raising", async () => {
    const reading = await sourced({
      sequences: { [grouping(WIDE_RELEASE, TODAY)]: [500, 500, 500] },
    }).showtimesFor(WIDE_RELEASE, TODAY, AREA);

    expect(reading).toEqual({
      ok: false,
      reason: "unreachable",
      fetchedAt: 1000,
      attempts: 3,
    });
  });

  it("reports an answer it could not decode rather than raising", async () => {
    const reading = await sourced({
      routes: {
        [grouping(WIDE_RELEASE, TODAY)]: {
          status: 200,
          body: "<html>we are having trouble</html>",
        },
      },
    }).showtimesFor(WIDE_RELEASE, TODAY, AREA);

    expect(reading).toEqual({
      ok: false,
      reason: "unreachable",
      fetchedAt: 1000,
      attempts: 3,
    });
  });

  it("turns an area into Theaters", async () => {
    const reading = await sourced().theatersNear(AREA);

    expect(payloadOf(reading)).toEqual(
      nearbyCapture().theaters.map((theater) => ({
        id: theater.formattedID,
        name: theater.name,
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

  it("gives a Theater one identity whichever way it is reached", async () => {
    const discovered = payloadOf(await sourced().theatersNear(AREA));
    const catalogue = await catalogueOf(WIDE_RELEASE, TODAY);
    const listed = new Map(
      everyShowtime(catalogue).map((showtime) => [
        showtime.presentation.theater.name,
        showtime.presentation.theater.id,
      ]),
    );
    const shared = discovered.filter((theater) => listed.has(theater.name));

    expect(shared.length).toBeGreaterThanOrEqual(24);
    expect(shared.map((theater) => theater.id)).toEqual(
      shared.map((theater) => listed.get(theater.name)),
    );
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
    const domain = [
      await sourced().showtimesFor(WIDE_RELEASE, TODAY, AREA),
      await sourced().theatersNear(AREA),
    ];

    expect(codes.size).toBeGreaterThanOrEqual(15);
    expect(
      [...new Set(domain.flatMap(keysIn))]
        .filter((key) => upstream.has(key))
        .toSorted(),
    ).toEqual(["formats", "id", "name"]);
    expect(
      domain
        .flatMap((reading) => namedIn(reading, null))
        .flatMap(([, value]) => (typeof value === "string" ? [value] : []))
        .filter((value) => codes.has(value)),
    ).toEqual([]);
  });
});
