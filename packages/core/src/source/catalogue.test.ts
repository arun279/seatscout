import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  Catalogue,
  Chain,
  Showtime,
  TicketingUrl,
  Unidentified,
} from "../domain/catalogue.js";
import {
  AREA,
  answering,
  capturedRows,
  catalogueOf,
  counted,
  everyShowtime,
  grouping,
  groupingCapture,
  instead,
  payloadOf,
  sourced,
  TODAY,
  WIDE_RELEASE,
} from "./catalogue.fixtures.js";

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

  it("cannot be asked for a Chain the Source has never named", () => {
    expectTypeOf<"Landmark">().toExtend<Chain>();
    expectTypeOf<"Regal">().not.toExtend<Chain>();
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
});
