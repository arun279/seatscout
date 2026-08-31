import { describe, expect, it } from "vitest";
import {
  nearbyTheatersCaptures,
  seatMapCaptures,
  seatMapFailureCaptures,
  showtimeGroupingCaptures,
} from "../corpus/captures.js";
import type { CapturedSeat, CapturedSeatMap } from "../corpus/types.js";
import { seatFrom } from "../source/seat-map.js";
import {
  type Answer,
  areaDivergencesIn,
  divergencesIn,
  listingDivergencesIn,
  SETTLED_STATUSES,
} from "./contract.js";

const FETCHED_AT = 1000;

interface Found {
  readonly map: CapturedSeatMap;
  readonly seat: CapturedSeat;
  readonly at: number;
}

const answerOf = (body: unknown, status: number): Answer => ({
  status,
  body: JSON.stringify(body),
  fetchedAt: FETCHED_AT,
});

const seatWhere = (holds: (seat: CapturedSeat) => boolean): Found => {
  const found = [...seatMapCaptures.values()].flatMap((capture) =>
    capture.body.seats.flatMap((seat, at) =>
      holds(seat) ? [{ map: capture.body, seat, at }] : [],
    ),
  );
  const first = found[0];
  if (first === undefined) throw new Error("no captured Seat answers that");
  return first;
};

const changed = (
  found: Found,
  change: Readonly<Record<string, unknown>>,
): Answer =>
  answerOf(
    {
      ...found.map,
      seats: found.map.seats.map((seat, at) =>
        at === found.at ? { ...seat, ...change } : seat,
      ),
    },
    200,
  );

const ordinary = () => seatWhere((seat) => seat.type === "standard");

const listingCapture = () => {
  const capture = showtimeGroupingCaptures.get(
    "showtimes/grouping-245569-2026-08-28.json",
  );
  if (capture === undefined) throw new Error("the listing was never captured");
  return capture.body;
};

const identifiedNowhere = (body: unknown): Answer => ({
  status: 200,
  body: JSON.stringify(body, (key, value) =>
    key === "id" ? undefined : value,
  ),
  fetchedAt: FETCHED_AT,
});

const sellingAs = (word: string | undefined): Answer => ({
  status: 200,
  body: JSON.stringify(listingCapture(), (key, value) =>
    key === "type" ? word : value,
  ),
  fetchedAt: FETCHED_AT,
});

const areaCapture = () => {
  const capture = nearbyTheatersCaptures.get("theaters/nearby-theaters.json");
  if (capture === undefined) throw new Error("the area was never captured");
  return capture.body;
};

const eachWord = (field: string, words: readonly string[]) =>
  Object.fromEntries(
    words.map((word) => [
      word,
      divergencesIn(changed(ordinary(), { [field]: word })),
    ]),
  );

describe("the contract the corpus recorded", () => {
  it("finds nothing diverging in any captured answer", () => {
    expect(
      [...seatMapCaptures.values(), ...seatMapFailureCaptures.values()].flatMap(
        (capture) => divergencesIn(answerOf(capture.body, capture.status)),
      ),
    ).toEqual([]);
  });

  it("recognises every seat status the corpus recorded, and every settled one", () => {
    expect(eachWord("status", ["A", "R", "O", "X", "H", "Z"])).toEqual({
      A: [],
      R: [],
      O: [],
      X: [],
      H: [],
      Z: [{ kind: "status", name: "Z" }],
    });
  });

  it("settles no seat status the seat map adapter reads differently", () => {
    expect(
      Object.fromEntries(
        Object.keys(SETTLED_STATUSES).map((status) => [
          status,
          seatFrom({ ...ordinary().seat, status }, FETCHED_AT).bookable,
        ]),
      ),
    ).toEqual(SETTLED_STATUSES);
  });

  it("recognises every seat type the corpus recorded and no other", () => {
    expect(
      eachWord("type", [
        "standard",
        "wheelchair",
        "companion",
        "recliner",
        "WHL",
      ]),
    ).toEqual({
      standard: [],
      wheelchair: [],
      companion: [],
      recliner: [{ kind: "type", name: "recliner" }],
      WHL: [{ kind: "type", name: "WHL" }],
    });
  });

  it("names a field the parse needs and the answer no longer carries", () => {
    expect({
      "a seat without its width": divergencesIn(
        changed(ordinary(), { width: undefined }),
      ),
      "a map without its seats": divergencesIn(
        answerOf({ ...ordinary().map, seats: undefined }, 200),
      ),
      "a map whose seats are not a list": divergencesIn(
        answerOf({ ...ordinary().map, seats: 25 }, 200),
      ),
      "a body that is not a map at all": divergencesIn(answerOf(null, 200)),
      "a body that is not JSON": divergencesIn({
        status: 200,
        body: "<html>",
        fetchedAt: FETCHED_AT,
      }),
    }).toEqual({
      "a seat without its width": [{ kind: "missing", name: "width" }],
      "a map without its seats": [{ kind: "missing", name: "seats" }],
      "a map whose seats are not a list": [{ kind: "missing", name: "seats" }],
      "a body that is not a map at all": [{ kind: "missing", name: "seats" }],
      "a body that is not JSON": [{ kind: "unreadable", name: "json" }],
    });
  });

  it("names a field the answer carries that the corpus never recorded", () => {
    expect({
      "on a seat": divergencesIn(changed(ordinary(), { seatTier: "Recliner" })),
      "on the map": divergencesIn(
        answerOf(
          { ...ordinary().map, promotionBanner: "Half price Tuesdays" },
          200,
        ),
      ),
    }).toEqual({
      "on a seat": [{ kind: "unexpected", name: "seatTier" }],
      "on the map": [{ kind: "unexpected", name: "promotionBanner" }],
    });
  });

  it("names a Seat whose link no longer points at the Seat beside it", () => {
    const found = seatWhere(
      (seat) => seat.leftNeighbor !== "" && seat.rightNeighbor !== "",
    );
    const stray = [{ kind: "link", name: found.seat.id }];

    expect({
      "its left link names the Seat on its right": divergencesIn(
        changed(found, { leftNeighbor: found.seat.rightNeighbor }),
      ),
      "its right link names the Seat on its left": divergencesIn(
        changed(found, { rightNeighbor: found.seat.leftNeighbor }),
      ),
    }).toEqual({
      "its left link names the Seat on its right": stray,
      "its right link names the Seat on its left": stray,
    });
  });

  it("names both ends of a link once the gap under it reads as an aisle", () => {
    const found = seatWhere(
      (seat) => seat.leftNeighbor === "" && seat.rightNeighbor !== "",
    );

    expect(
      divergencesIn(changed(found, { width: found.seat.width / 4 })),
    ).toEqual([
      { kind: "link", name: found.seat.id },
      { kind: "link", name: found.seat.rightNeighbor },
    ]);
  });

  it("names a Seat whose link reaches past the end of its row", () => {
    const room = ordinary().map;
    const edgeAt = (
      widest: (seat: CapturedSeat, edge: CapturedSeat) => boolean,
    ) => {
      const edge = room.seats.reduce((furthest, seat) =>
        widest(seat, furthest) ? seat : furthest,
      );
      return { map: room, seat: edge, at: room.seats.indexOf(edge) };
    };
    const left = edgeAt((seat, edge) => seat.x < edge.x);
    const right = edgeAt((seat, edge) => seat.x > edge.x);

    expect({
      "past the left end": divergencesIn(
        changed(left, { leftNeighbor: "nowhere" }),
      ),
      "past the right end": divergencesIn(
        changed(right, { rightNeighbor: "nowhere" }),
      ),
    }).toEqual({
      "past the left end": [{ kind: "link", name: left.seat.id }],
      "past the right end": [{ kind: "link", name: right.seat.id }],
    });
  });

  it("says nothing about an answer the aggregator declined to give", () => {
    const refused = (status: number, body: string) =>
      divergencesIn({ status, body, fetchedAt: FETCHED_AT });

    expect({
      "general admission": refused(
        400,
        '[{"id":"GeneralAdmissionShowtimeError","message":""}]',
      ),
      "a screening that has begun": refused(
        404,
        '[{"id":"ExpiredPerformance","message":""}]',
      ),
      "a screening that sold out": refused(
        410,
        '[{"id":"PerformanceSoldOut","message":""}]',
      ),
      "a reason the corpus never met": refused(
        404,
        '[{"id":"ShowtimeNotFound","message":""}]',
      ),
      "a transport failure": refused(500, ""),
    }).toEqual({
      "general admission": [],
      "a screening that has begun": [],
      "a screening that sold out": [],
      "a reason the corpus never met": [],
      "a transport failure": [],
    });
  });

  it("finds nothing diverging in a captured area or a captured listing", () => {
    expect([
      ...areaDivergencesIn(answerOf(areaCapture(), 200)),
      ...listingDivergencesIn(answerOf(listingCapture(), 200)),
    ]).toEqual([]);
  });

  it("names the area and the listing it could not read into domain objects", () => {
    const area = areaCapture();
    const listing = listingCapture();

    expect(
      areaDivergencesIn(
        answerOf({ ...area, theaters: [...area.theaters, {}] }, 200),
      ),
    ).toEqual([{ kind: "missing", name: "theaters" }]);
    expect(
      listingDivergencesIn(answerOf({ ...listing, theaterShowtimes: {} }, 200)),
    ).toEqual([{ kind: "missing", name: "catalogue" }]);
  });

  it("says so when an answer is not JSON at all", () => {
    const answer: Answer = {
      status: 200,
      body: "<html>not today</html>",
      fetchedAt: FETCHED_AT,
    };

    expect([
      ...areaDivergencesIn(answer),
      ...listingDivergencesIn(answer),
    ]).toEqual([
      { kind: "unreadable", name: "json" },
      { kind: "unreadable", name: "json" },
    ]);
  });

  it("judges a seat map only when the Source answered one", () => {
    expect(
      divergencesIn({
        status: 500,
        body: "<html>we are having trouble</html>",
        fetchedAt: FETCHED_AT,
      }),
    ).toEqual([]);
  });

  it("says so when an area or a listing arrives with nothing in it", () => {
    const area = areaCapture();

    expect(areaDivergencesIn(answerOf({ ...area, theaters: [] }, 200))).toEqual(
      [{ kind: "empty", name: "theaters" }],
    );
    expect(
      listingDivergencesIn(
        answerOf({ theaterShowtimes: { theaters: [] } }, 200),
      ),
    ).toEqual([{ kind: "empty", name: "catalogue" }]);
  });

  it("names a Showtime a request would be spent on that does not say it is on sale", () => {
    expect({
      "the word the corpus recorded": listingDivergencesIn(
        sellingAs("available"),
      ),
      "the word for a Theater that has stopped selling": listingDivergencesIn(
        sellingAs("disabled"),
      ),
      "a word nobody has met": listingDivergencesIn(sellingAs("reopening")),
      "no word at all": listingDivergencesIn(sellingAs(undefined)),
    }).toEqual({
      "the word the corpus recorded": [],
      "the word for a Theater that has stopped selling": [],
      "a word nobody has met": [{ kind: "sellability", name: "reopening" }],
      "no word at all": [{ kind: "missing", name: "sellability" }],
    });
  });

  it("counts a Showtime a listing holds whether or not it was identified", () => {
    expect(listingDivergencesIn(identifiedNowhere(listingCapture()))).toEqual(
      [],
    );
    expect(
      listingDivergencesIn(
        identifiedNowhere({ theaterShowtimes: { theaters: [] } }),
      ),
    ).toEqual([{ kind: "empty", name: "catalogue" }]);
  });
});
