import { describe, expect, it } from "vitest";
import { seatMapCaptures, seatMapFailureCaptures } from "../corpus/captures.js";
import type { CapturedSeat, CapturedSeatMap } from "../corpus/types.js";
import { type Answer, divergencesIn } from "./contract.js";

const FETCHED_AT = 1000;
const ROOM = "561682851";

const answerOf = (body: unknown, status: number): Answer => ({
  status,
  body: JSON.stringify(body),
  fetchedAt: FETCHED_AT,
});

const roomIn = (showtime: string): CapturedSeatMap => {
  const capture = [...seatMapCaptures.values()].find(
    (entry) => entry.body.showtimeId === showtime,
  );
  if (capture === undefined)
    throw new Error(`the corpus holds no seat map for showtime ${showtime}`);
  return capture.body;
};

const seatIn = (
  room: CapturedSeatMap,
  holds: (seat: CapturedSeat) => boolean,
) => {
  const at = room.seats.findIndex(holds);
  const seat = room.seats[at];
  if (seat === undefined) throw new Error("no captured Seat answers that");
  return { at, seat };
};

const seatChanged = (
  at: number,
  change: Readonly<Record<string, unknown>>,
): Answer => {
  const room = roomIn(ROOM);
  return answerOf(
    {
      ...room,
      seats: room.seats.map((seat, index) =>
        index === at ? { ...seat, ...change } : seat,
      ),
    },
    200,
  );
};

const eachWord = (field: string, words: readonly string[]) =>
  Object.fromEntries(
    words.map((word) => [
      word,
      divergencesIn(seatChanged(0, { [field]: word })),
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

  it("recognises every seat status the corpus recorded and no other", () => {
    expect(eachWord("status", ["A", "R", "O", "X", "H", "Z"])).toEqual({
      A: [],
      R: [],
      O: [],
      X: [],
      H: [{ kind: "status", name: "H" }],
      Z: [{ kind: "status", name: "Z" }],
    });
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
        seatChanged(0, { width: undefined }),
      ),
      "a map without its seats": divergencesIn(
        answerOf({ ...roomIn(ROOM), seats: undefined }, 200),
      ),
      "a map whose seats are not a list": divergencesIn(
        answerOf({ ...roomIn(ROOM), seats: 25 }, 200),
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
    const room = roomIn(ROOM);
    expect({
      "on a seat": divergencesIn(seatChanged(0, { seatTier: "Recliner" })),
      "on the map": divergencesIn(
        answerOf({ ...room, promotionBanner: "Half price Tuesdays" }, 200),
      ),
    }).toEqual({
      "on a seat": [{ kind: "unexpected", name: "seatTier" }],
      "on the map": [{ kind: "unexpected", name: "promotionBanner" }],
    });
  });

  it("names a Seat whose links no longer point at the Seat beside it", () => {
    const room = roomIn(ROOM);
    const { at, seat } = seatIn(
      room,
      (candidate) =>
        candidate.leftNeighbor !== "" && candidate.rightNeighbor !== "",
    );

    expect(
      divergencesIn(
        seatChanged(at, {
          leftNeighbor: seat.rightNeighbor,
          rightNeighbor: seat.leftNeighbor,
        }),
      ),
    ).toEqual([{ kind: "link", name: seat.id }]);
  });

  it("names both ends of a link once the gap under it reads as an aisle", () => {
    const room = roomIn(ROOM);
    const { at, seat } = seatIn(
      room,
      (candidate) =>
        candidate.leftNeighbor === "" && candidate.rightNeighbor !== "",
    );

    expect(divergencesIn(seatChanged(at, { width: seat.width / 4 }))).toEqual([
      { kind: "link", name: seat.id },
      { kind: "link", name: seat.rightNeighbor },
    ]);
  });

  it("names a Seat whose link reaches past the end of its row", () => {
    const room = roomIn(ROOM);
    const edge = room.seats.reduce((furthest, seat) =>
      seat.x > furthest.x ? seat : furthest,
    );
    const elsewhere = seatIn(room, (seat) => seat.y !== edge.y);

    expect(
      divergencesIn(
        seatChanged(room.seats.indexOf(edge), {
          rightNeighbor: elsewhere.seat.id,
        }),
      ),
    ).toEqual([{ kind: "link", name: edge.id }]);
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
      "a reason the corpus never met": refused(
        404,
        '[{"id":"ShowtimeNotFound","message":""}]',
      ),
      "a transport failure": refused(500, ""),
    }).toEqual({
      "general admission": [],
      "a screening that has begun": [],
      "a reason the corpus never met": [],
      "a transport failure": [],
    });
  });
});
