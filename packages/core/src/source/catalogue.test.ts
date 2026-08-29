import { describe, expect, expectTypeOf, it } from "vitest";
import {
  nearbyTheatersCaptures,
  seatMapCaptures,
  showtimeGroupingCaptures,
} from "../corpus/captures.js";
import type { CapturedShowtimeGrouping } from "../corpus/types.js";
import {
  type Catalogue,
  narrowed,
  type Showtime,
  type TicketingUrl,
  type UnbookableReason,
  type Unidentified,
} from "../domain/catalogue.js";
import {
  type FakeUpstream,
  type UpstreamScript,
  fakeUpstream,
} from "../testing/fake-upstream.js";
import { openSource } from "./aggregator.js";
import { sellabilityFrom } from "./catalogue.js";
import type { Reading, Source, Unreadable } from "./port.js";

const BOOTSTRAP = "/napi/preferences/themes";
const NEARBY = "/napi/nearbyTheaters";
const SEAT_MAP = "/napi/seatMap/";
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

const rig = (
  script: Omit<UpstreamScript, "seed"> = {},
): { readonly fetch: FakeUpstream; readonly source: Source } => {
  const fetch = fakeUpstream({
    seed: 4,
    ...script,
    routes: { [BOOTSTRAP]: { status: 200, body: "{}" }, ...script.routes },
  });
  return {
    fetch,
    source: openSource({
      fetch,
      now: () => 1000,
      wait: () => Promise.resolve(),
      random: () => 0.5,
    }),
  };
};

const sourced = (script: Omit<UpstreamScript, "seed"> = {}): Source =>
  rig(script).source;

const payloadOf = <Found>(reading: Reading<Found>): Found => {
  if (!reading.ok) throw new Error(`the Source answered ${reading.reason}`);
  return reading.payload;
};

const catalogueOf = async (movie: string, date: string): Promise<Catalogue> =>
  payloadOf(await sourced().showtimesFor(movie, date, AREA));

const everyShowtime = (
  catalogue: Catalogue,
): readonly (Showtime | Unidentified)[] => [
  ...catalogue.bookable,
  ...catalogue.unbookable.map((entry) => entry.showtime),
  ...catalogue.unidentified,
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

const THEATERS_THE_SOURCE_STOPPED_IDENTIFYING = [
  "AMC NorthPark 15",
  "AMC Village on the Parkway 9",
  "Cinemark Central Plano",
  "Cinemark Dallas XD and IMAX",
  "Cinemark Frisco Square and XD",
  "Cinemark Legacy and XD",
  "Cinemark Lewisville and XD",
  "Cinemark Tinseltown Grapevine and XD",
  "Cinemark West Plano and XD",
];

const rowsRewritten = (
  theater: CapturedTheaters[number],
  change: (showtimes: unknown) => unknown,
) => ({
  ...theater,
  variants: theater.variants.map((variant) => ({
    ...variant,
    amenityGroups: variant.amenityGroups.map((group) => ({
      ...group,
      showtimes: change(group.showtimes),
    })),
  })),
});

const asTheSourceAnswersFor = (
  theaters: readonly string[],
  change: (showtimes: unknown) => unknown,
) => {
  const capture = groupingCapture(WIDE_RELEASE, TODAY);
  return {
    theaterShowtimes: {
      ...capture.theaterShowtimes,
      theaters: capture.theaterShowtimes.theaters.map((theater) =>
        theaters.includes(theater.name)
          ? rowsRewritten(theater, change)
          : theater,
      ),
    },
  };
};

const asTheSourceAnsweredIt = () =>
  asTheSourceAnswersFor(THEATERS_THE_SOURCE_STOPPED_IDENTIFYING, (showtimes) =>
    without(showtimes, "id"),
  );

const THEATER_THE_SOURCE_STOPPED_SELLING = "Cinemark Dallas XD and IMAX";
const A_THEATER_STILL_SELLING = "AMC Village on the Parkway 9";

const withOneTheaterOffSale = () =>
  asTheSourceAnswersFor([THEATER_THE_SOURCE_STOPPED_SELLING], (showtimes) =>
    instead(showtimes, "type", "disabled"),
  );

const rowsAt = (name: string) =>
  capturedRows(
    groupingCapture(WIDE_RELEASE, TODAY).theaterShowtimes.theaters.filter(
      (theater) => theater.name === name,
    ),
  );

const theaterIn = (catalogue: Catalogue, name: string) => {
  const showtime = everyShowtime(catalogue).find(
    (entry) => entry.presentation.theater.name === name,
  );
  if (showtime === undefined) throw new Error(`${name} is not in this capture`);
  return showtime.presentation.theater.id;
};

const idsAt = (catalogue: Catalogue, name: string) =>
  catalogue.bookable
    .filter((showtime) => showtime.presentation.theater.name === name)
    .map((showtime) => `${showtime.id}`);

const capturedRoom = () => {
  const [capture] = [...seatMapCaptures.values()];
  if (capture === undefined) throw new Error("the corpus holds no rooms");
  return { status: 200, body: JSON.stringify(capture.body) };
};

const refusing = (ids: readonly string[]) =>
  Object.fromEntries(
    ids.map((id) => [`${SEAT_MAP}${id}`, { status: 500, body: "" }]),
  );

const answeringRooms = (ids: readonly string[]) =>
  Object.fromEntries(ids.map((id) => [`${SEAT_MAP}${id}`, capturedRoom()]));

const readingOf = (body: unknown) =>
  sourced(answering(grouping(WIDE_RELEASE, TODAY), body)).showtimesFor(
    WIDE_RELEASE,
    TODAY,
    AREA,
  );

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
          chain: "Cinemark Theatres",
        },
        formats: ["D-BOX", "XD"],
        amenities: ["Recliners"],
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

  it("cannot file a Showtime it did identify among the ones it did not", () => {
    expectTypeOf<Showtime>().not.toExtend<Unidentified>();
    expectTypeOf<Unidentified>().not.toExtend<Showtime>();
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

  it("names a Theater the Source stopped selling at rather than calling its Showtimes bookable", async () => {
    const catalogue = payloadOf(await readingOf(withOneTheaterOffSale()));
    const offSale = catalogue.unbookable.filter(
      (entry) => entry.reason === "salesOff",
    );

    expect({
      bookable: catalogue.bookable.length,
      noSeatMap: counted(catalogue, "noSeatMap"),
      started: counted(catalogue, "started"),
      soldOut: counted(catalogue, "soldOut"),
      salesOff: counted(catalogue, "salesOff"),
    }).toEqual({
      bookable: 158,
      noSeatMap: 3,
      started: 0,
      soldOut: 1,
      salesOff: 14,
    });
    expect([
      ...new Set(
        offSale.map((entry) => entry.showtime.presentation.theater.name),
      ),
    ]).toEqual([THEATER_THE_SOURCE_STOPPED_SELLING]);
    expect(offSale.map((entry) => entry.showtime.ticketing).toSorted()).toEqual(
      rowsAt(THEATER_THE_SOURCE_STOPPED_SELLING)
        .map((row) => row.ticketingJumpPageURL)
        .toSorted(),
    );
  });

  it("reads the word for the one value the flags cannot express and for no other", async () => {
    const capture = groupingCapture(WIDE_RELEASE, TODAY);
    const tally = async (word: unknown) => {
      const catalogue = payloadOf(
        await readingOf(instead(capture, "type", word)),
      );
      return {
        bookable: catalogue.bookable.length,
        salesOff: counted(catalogue, "salesOff"),
      };
    };

    expect(await tally("available")).toEqual({ bookable: 172, salesOff: 0 });
    expect(await tally("pastshowtime")).toEqual({ bookable: 172, salesOff: 0 });
    expect(await tally("soldout")).toEqual({ bookable: 172, salesOff: 0 });
    expect(await tally("a word nobody has met")).toEqual({
      bookable: 172,
      salesOff: 0,
    });
    expect(await tally("disabled")).toEqual({ bookable: 0, salesOff: 173 });
  });

  it("keeps the reason that outlives sales being off, and takes the one that does not", async () => {
    const yesterday = "2026-08-27";
    const offSaleOn = async (date: string) => {
      const catalogue = payloadOf(
        await sourced(
          answering(
            grouping(WIDE_RELEASE, date),
            instead(groupingCapture(WIDE_RELEASE, date), "type", "disabled"),
          ),
        ).showtimesFor(WIDE_RELEASE, date, AREA),
      );
      return {
        noSeatMap: counted(catalogue, "noSeatMap"),
        started: counted(catalogue, "started"),
        soldOut: counted(catalogue, "soldOut"),
        salesOff: counted(catalogue, "salesOff"),
      };
    };

    expect(await offSaleOn(TODAY)).toEqual({
      noSeatMap: 3,
      started: 0,
      soldOut: 0,
      salesOff: 173,
    });
    expect(await offSaleOn(yesterday)).toEqual({
      noSeatMap: 3,
      started: 77,
      soldOut: 0,
      salesOff: 0,
    });
  });

  it("answers a listing whose rows carry no such word rather than refusing it", async () => {
    const catalogue = payloadOf(
      await readingOf(without(groupingCapture(WIDE_RELEASE, TODAY), "type")),
    );

    expect({
      bookable: catalogue.bookable.length,
      salesOff: counted(catalogue, "salesOff"),
    }).toEqual({ bookable: 172, salesOff: 0 });
  });

  it("refuses a whole listing whose word is there and is not one", async () => {
    const capture = groupingCapture(WIDE_RELEASE, TODAY);
    const words: readonly unknown[] = [1, null, true];
    const refused: unknown[] = [];
    for (const word of words)
      if (!(await readingOf(instead(capture, "type", word))).ok)
        refused.push(word);

    expect(refused).toEqual(words);
  });

  it("keeps the reason only a listing can give out of the ones a status code can", () => {
    expectTypeOf<"salesOff">().toExtend<UnbookableReason>();
    expectTypeOf<"salesOff">().not.toExtend<Unreadable>();
    expectTypeOf<"soldOut">().toExtend<Unreadable>();
  });

  it("reads the word the Source put on every row it gave no reason to refuse", () => {
    const capture = groupingCapture(WIDE_RELEASE, TODAY);
    const listed = (body: unknown) => sellabilityFrom(JSON.stringify(body));

    expect(listed(capture)).toEqual({
      rows: 176,
      notRefused: new Array(172).fill("available"),
    });
    expect(listed(withOneTheaterOffSale())).toEqual({
      rows: 176,
      notRefused: new Array(158).fill("available"),
    });
    expect(listed(without(capture, "type"))).toEqual({
      rows: 176,
      notRefused: new Array(172).fill(undefined),
    });
    expect(sellabilityFrom("not a listing at all")).toBeNull();
  });

  it("spends no request on a Theater whose sales are off, and leaves the circuit closed for the rest of the area", async () => {
    const whole = await catalogueOf(WIDE_RELEASE, TODAY);
    const terms = {
      theaters: [
        theaterIn(whole, THEATER_THE_SOURCE_STOPPED_SELLING),
        theaterIn(whole, A_THEATER_STILL_SELLING),
      ],
    };
    const offSale = idsAt(
      narrowed(whole, terms),
      THEATER_THE_SOURCE_STOPPED_SELLING,
    );
    const onSale = idsAt(narrowed(whole, terms), A_THEATER_STILL_SELLING);
    const spentOn = async (listing: unknown) => {
      const run = rig({
        routes: {
          [grouping(WIDE_RELEASE, TODAY)]: {
            status: 200,
            body: JSON.stringify(listing),
          },
          ...refusing(offSale),
          ...answeringRooms(onSale),
        },
      });
      const listed = narrowed(
        payloadOf(await run.source.showtimesFor(WIDE_RELEASE, TODAY, AREA)),
        terms,
      );
      const attempts: number[] = [];
      for (const showtime of listed.bookable)
        attempts.push((await run.source.seatsFor(`${showtime.id}`)).attempts);
      return {
        attempts,
        asked: run.fetch.requests
          .map((request) => request.path)
          .filter((path) => path.startsWith(SEAT_MAP))
          .map((path) => path.slice(SEAT_MAP.length)),
      };
    };

    const before = await spentOn(groupingCapture(WIDE_RELEASE, TODAY));
    const after = await spentOn(withOneTheaterOffSale());

    expect([offSale.length, onSale.length]).toEqual([14, 4]);
    expect(before.attempts).toEqual([3, 3, 3, ...new Array(15).fill(0)]);
    expect(new Set(before.asked)).toEqual(new Set(offSale.slice(0, 3)));
    expect(after.attempts).toEqual([1, 1, 1, 1]);
    expect(after.asked).toEqual(onSale);
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

  it("answers an area whose Theaters lost their Showtime identities rather than refusing it", async () => {
    const catalogue = payloadOf(await readingOf(asTheSourceAnsweredIt()));

    expect({
      bookable: catalogue.bookable.length,
      noSeatMap: counted(catalogue, "noSeatMap"),
      started: counted(catalogue, "started"),
      soldOut: counted(catalogue, "soldOut"),
      unidentified: catalogue.unidentified.length,
    }).toEqual({
      bookable: 100,
      noSeatMap: 3,
      started: 0,
      soldOut: 1,
      unidentified: 72,
    });
  });

  it("answers with every row every captured listing holds", async () => {
    const listed: number[] = [];
    const answered: number[] = [];
    for (const [movie, date] of GROUPINGS) {
      listed.push(
        capturedRows(groupingCapture(movie, date).theaterShowtimes.theaters)
          .length,
      );
      answered.push(everyShowtime(await catalogueOf(movie, date)).length);
    }

    expect(listed).toEqual([236, 80, 176, 175, 157]);
    expect(answered).toEqual(listed);
  });

  it("answers with every row the Source listed, whether or not the row was identified", async () => {
    const capture = groupingCapture(WIDE_RELEASE, TODAY);
    const listed = capturedRows(capture.theaterShowtimes.theaters).length;
    const whole = await catalogueOf(WIDE_RELEASE, TODAY);
    const partly = payloadOf(await readingOf(asTheSourceAnsweredIt()));
    const none = payloadOf(await readingOf(without(capture, "id")));

    expect(listed).toBe(176);
    expect([whole, partly, none].map((it) => everyShowtime(it).length)).toEqual(
      [listed, listed, listed],
    );
    expect([
      whole.unidentified.length,
      partly.unidentified.length,
      none.unidentified.length,
    ]).toEqual([0, 72, 172]);
  });

  it("asks why a Showtime is unbookable before it asks whether it was identified", async () => {
    const yesterday = "2026-08-27";
    const capture = groupingCapture(WIDE_RELEASE, yesterday);
    const catalogue = payloadOf(
      await sourced(
        answering(grouping(WIDE_RELEASE, yesterday), without(capture, "id")),
      ).showtimesFor(WIDE_RELEASE, yesterday, AREA),
    );

    expect({
      bookable: catalogue.bookable.length,
      noSeatMap: counted(catalogue, "noSeatMap"),
      started: counted(catalogue, "started"),
      unidentified: catalogue.unidentified.length,
    }).toEqual({ bookable: 0, noSeatMap: 3, started: 77, unidentified: 0 });
  });

  it("keeps the Presentation and the ticketing URL of a Showtime it cannot identify", async () => {
    const supplied = capturedRows(
      groupingCapture(WIDE_RELEASE, TODAY).theaterShowtimes.theaters.filter(
        (theater) =>
          THEATERS_THE_SOURCE_STOPPED_IDENTIFYING.includes(theater.name),
      ),
    );
    const catalogue = payloadOf(await readingOf(asTheSourceAnsweredIt()));

    expect(
      [
        ...new Set(
          catalogue.unidentified.flatMap((showtime) => Object.keys(showtime)),
        ),
      ].toSorted(),
    ).toEqual(["presentation", "startsAt", "ticketing"]);
    expect(
      catalogue.unidentified.map((showtime) => showtime.ticketing).toSorted(),
    ).toEqual(supplied.map((row) => row.ticketingJumpPageURL).toSorted());
    expect(
      [
        ...new Set(
          catalogue.unidentified.map(
            (showtime) => showtime.presentation.theater.name,
          ),
        ),
      ].toSorted(),
    ).toEqual(THEATERS_THE_SOURCE_STOPPED_IDENTIFYING);
  });

  it("refuses a whole listing whose identity is there and is not one", async () => {
    const capture = groupingCapture(WIDE_RELEASE, TODAY);
    const identities: readonly unknown[] = ["561528003", null, true];
    const refused: unknown[] = [];
    for (const identity of identities)
      if (!(await readingOf(instead(capture, "id", identity))).ok)
        refused.push(identity);

    expect(refused).toEqual(identities);
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
