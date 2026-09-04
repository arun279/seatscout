import { describe, expect, expectTypeOf, it } from "vitest";
import { seatMapCaptures } from "../corpus/captures.js";
import {
  type Catalogue,
  narrowed,
  type UnbookableReason,
} from "../domain/catalogue.js";
import {
  AREA,
  answering,
  asTheSourceAnswersFor,
  capturedRows,
  catalogueOf,
  counted,
  everyShowtime,
  grouping,
  groupingCapture,
  instead,
  payloadOf,
  readingOf,
  rig,
  sourced,
  TODAY,
  WIDE_RELEASE,
  without,
} from "./catalogue.fixtures.js";
import { sellabilityFrom } from "./catalogue.js";
import type { Unreadable } from "./port.js";

const SEAT_MAP = "/napi/seatMap/";

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

describe("the catalogue's sellability", () => {
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
});
