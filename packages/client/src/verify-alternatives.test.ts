import { REFERENCE, type Showtime, type TicketingUrl } from "@seatscout/core";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { SeatGroupResult } from "./ranking.js";
import {
  ACCESSIBLE_ROOM,
  AREA,
  alternativesIn,
  POD_ROOM,
  SEARCHED_AT,
  seatsIn,
  TODAY,
  VERIFIED_AT,
  verifying,
  WIDE_RELEASE,
  withoutTheFirstSeat,
} from "./verify.fixtures.js";
import type { openVerification, Verified } from "./verify.js";

describe("what a re-verification offers instead", () => {
  it("carries on a result the terms a re-verification needs, and none the listing was narrowed by", async () => {
    const run = await verifying({ formats: ["Dolby Cinema"] });

    expect(Object.keys(run.result.terms).toSorted()).toEqual([
      "accessibleSeating",
      "area",
      "date",
      "movie",
      "partySize",
      "profile",
    ]);
    expect(run.result.terms).toEqual({
      movie: WIDE_RELEASE,
      date: TODAY,
      area: AREA,
      partySize: 2,
      accessibleSeating: false,
      profile: undefined,
    });
    expectTypeOf<
      Parameters<ReturnType<typeof openVerification>>
    >().toEqualTypeOf<[SeatGroupResult]>();
  });

  it("ranks the alternatives against the Seat Profile the Query carried", async () => {
    const reference = await verifying({ answer: withoutTheFirstSeat });
    const front = await verifying({
      answer: withoutTheFirstSeat,
      profile: { ...REFERENCE, targetDepth: 0 },
    });
    const middle = alternativesIn(await reference.verify());
    const nearest = alternativesIn(await front.verify());

    expect(seatsIn(reference.result)).toEqual(["F9", "F8"]);
    expect(seatsIn(front.result)).toEqual(["A8", "A7"]);
    expect(middle[0]?.reasons.rowFromFront).toBe(6);
    expect(nearest[0]?.reasons.rowFromFront).toBe(1);
  });

  it("offers only Seat Groups carrying an accessible Seat to a Query that asked for one", async () => {
    const run = await verifying({
      accessibleSeating: true,
      room: ACCESSIBLE_ROOM,
      answer: withoutTheFirstSeat,
    });
    const alternatives = alternativesIn(await run.verify());

    expect(seatsIn(run.result)).toEqual(["D4", "D3"]);
    expect(alternatives.map(seatsIn)).toEqual([
      ["D6", "D5"],
      ["D2", "D1"],
      ["D8", "D7"],
    ]);
    expect(
      alternatives.filter((alternative) =>
        alternative.seats.every((seat) => seat.designation === "standard"),
      ),
    ).toEqual([]);
  });

  it("answers with a fresh reading of the Seat Group rather than the one it was handed", async () => {
    const run = await verifying();
    const verified = await run.verify();

    expect(run.result.fetchedAt).toBe(SEARCHED_AT);
    expect(verified.ok && verified.result.fetchedAt).toBe(VERIFIED_AT);
    expect(
      verified.ok &&
        verified.result.seats.map((seat) => seat.provenance.fetchedAt),
    ).toEqual([VERIFIED_AT, VERIFIED_AT]);
    expect(verified.ok && verified.result.key).toBe(run.result.key);
    expect(verified.ok && verified.result.score).toBe(run.result.score);
  });

  it("carries the consoles the Seat Group crosses into the reading it answers with", async () => {
    const run = await verifying({ partySize: 3, room: POD_ROOM });
    const verified = await run.verify();

    expect(seatsIn(run.result)).toEqual(["E7", "E6", "E5"]);
    expect(run.result.podDividers).toBe(1);
    expect(verified.ok && verified.result.podDividers).toBe(1);
    expect(verified.ok && verified.result.score).toBe(run.result.score);
  });

  it("offers a search result nothing that can be handed off", () => {
    expectTypeOf<SeatGroupResult>().not.toHaveProperty("ticketing");
    expectTypeOf<SeatGroupResult["showtime"]>().not.toHaveProperty("ticketing");
    expectTypeOf<SeatGroupResult["showtime"]>().not.toExtend<Showtime>();
    expectTypeOf<Extract<Verified, { ok: false }>>().not.toHaveProperty(
      "ticketing",
    );
    expectTypeOf<
      Extract<Verified, { ok: true }>["ticketing"]
    >().toEqualTypeOf<TicketingUrl>();
  });
});
