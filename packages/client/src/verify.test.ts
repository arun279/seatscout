import { SOLD_OUT } from "@seatscout/core/testing";
import { describe, expect, it } from "vitest";
import { inMemoryStore } from "./store.js";
import {
  AN_HOUR,
  alternativesIn,
  holding,
  LISTING,
  refusalNamed,
  refusing,
  roomWhere,
  SEARCHED_AT,
  SEAT_MAP,
  seatsIn,
  verifying,
  withoutTheFirstSeat,
} from "./verify.fixtures.js";

describe("re-verifying a Seat Group", () => {
  it("hands back the ticketing URL the listing carried for that Showtime and no other", async () => {
    const run = await verifying();
    const verified = await run.verify();
    const listed = [
      ...run.listed.bookable,
      ...run.listed.unbookable.map((entry) => entry.showtime),
    ];
    const supplied = listed
      .filter((showtime) => showtime.id === run.result.showtime.id)
      .map((showtime) => showtime.ticketing);
    const elsewhere = listed
      .filter((showtime) => showtime.id !== run.result.showtime.id)
      .map((showtime) => showtime.ticketing);

    expect(supplied).toHaveLength(1);
    expect(verified.ok && verified.ticketing).toBe(supplied[0]);
    expect(elsewhere).toHaveLength(505);
    expect(elsewhere).not.toContain(supplied[0]);
  });

  it("re-reads the Auditorium however old the result is, and re-reads no listing it still holds", async () => {
    const fresh = await verifying({ at: SEARCHED_AT });
    const stale = await verifying({ at: SEARCHED_AT + AN_HOUR });
    const twice = await verifying();

    expect((await fresh.verify()).ok).toBe(true);
    expect((await stale.verify()).ok).toBe(true);
    expect(fresh.requested()).toEqual([
      `${SEAT_MAP}${fresh.result.showtime.id}`,
    ]);
    expect(stale.requested()).toEqual([
      `${SEAT_MAP}${stale.result.showtime.id}`,
    ]);

    await twice.verify();
    await twice.verify();

    expect(twice.auditoriumsRead()).toHaveLength(2);
  });

  it("answers taken, with the Auditorium's remaining Seat Groups ranked best-first", async () => {
    const run = await verifying({ answer: withoutTheFirstSeat });
    const verified = await run.verify();
    const alternatives = alternativesIn(verified);
    const scores = alternatives.map((alternative) => alternative.score);

    expect(seatsIn(run.result)).toEqual(["F5", "F6"]);
    expect(verified.ok).toBe(false);
    expect(verified.ok || verified.reason).toBe("taken");
    expect(alternatives.map((alternative) => alternative.key)).toEqual([
      "562047982:F7+F8",
      "562047982:G7+G8",
      "562047982:F3+F4",
      "562047982:H10+H11",
      "562047982:E4+E5",
      "562047982:C8+C9",
      "562047982:F11+F12",
      "562047982:I10+I11",
      "562047982:E10+E11",
      "562047982:B8+B9",
      "562047982:H3+H4",
      "562047982:G1+G2",
      "562047982:F1+F2",
      "562047982:A8+A9",
      "562047982:E1+E2",
      "562047982:G13+G14",
      "562047982:H16+H17",
      "562047982:F13+F14",
      "562047982:E13+E14",
      "562047982:D9+D10",
      "562047982:C15+C16",
      "562047982:C1+C2",
      "562047982:B15+B16",
      "562047982:B1+B2",
    ]);
    expect(alternatives.flatMap(seatsIn)).not.toContain("F5");
    expect(new Set(scores).size).toBe(scores.length);
  });

  it("does not call a Seat Group taken because a Seat beside it came free", async () => {
    const freed = (room: string) => roomWhere(room, { F10: "A" });
    const run = await verifying({ answer: (_, room) => freed(room) });
    const shifted = await verifying({ searchedIn: freed });
    const verified = await run.verify();

    expect(seatsIn(shifted.result)).toEqual(["F7", "F8"]);
    expect(verified.ok && seatsIn(verified.result)).toEqual(["F5", "F6"]);
    expect(verified.ok && verified.result.key).toBe(run.result.key);
    expect(verified.ok && verified.result.removed.unavailable).toBe(
      run.result.removed.unavailable - 1,
    );
  });

  it("answers taken and offers no alternative when the Auditorium refuses the read", async () => {
    const runs = await Promise.all(
      [
        SOLD_OUT,
        refusalNamed("ExpiredPerformance"),
        refusalNamed("GeneralAdmissionShowtimeError"),
      ].map((refusal) => verifying({ answer: () => refusal })),
    );
    const verified = await Promise.all(runs.map((run) => run.verify()));

    expect(verified.map((one) => one.ok)).toEqual([false, false, false]);
    expect(verified.map((one) => one.ok || one.reason)).toEqual([
      "taken",
      "taken",
      "taken",
    ]);
    expect(verified.flatMap(alternativesIn)).toEqual([]);
  });

  it("answers unreachable and no ticketing URL when the Auditorium cannot be read", async () => {
    const run = await verifying({ script: refusing });
    const verified = await run.verify();

    expect(verified.ok).toBe(false);
    expect(verified.ok || verified.reason).toBe("unreachable");
    expect(alternativesIn(verified)).toEqual([]);
    expect(verified).not.toHaveProperty("ticketing");
    expect(run.auditoriumsRead()).toHaveLength(3);
  });

  it("answers unreachable rather than taken, and asks once, when the Source refuses the Auditorium", async () => {
    const run = await verifying({
      script: (bookable) => ({
        sequences: Object.fromEntries(
          bookable.map((showtime) => [`${SEAT_MAP}${showtime.id}`, [403]]),
        ),
      }),
    });
    const verified = await run.verify();

    expect(verified.ok || verified.reason).toBe("unreachable");
    expect(alternativesIn(verified)).toEqual([]);
    expect(run.auditoriumsRead()).toHaveLength(1);
  });

  it("answers unreachable, and spends no request on an Auditorium, when the listing cannot be read", async () => {
    const run = await verifying({
      store: () => inMemoryStore(),
      script: () => ({ sequences: { [LISTING]: [500, 500, 500] } }),
    });
    const verified = await run.verify();

    expect(verified.ok).toBe(false);
    expect(verified.ok || verified.reason).toBe("unreachable");
    expect(run.auditoriumsRead()).toEqual([]);
  });

  it("answers taken, without asking for an Auditorium, when the listing no longer offers the Showtime", async () => {
    const run = await verifying({
      store: (listed) =>
        holding({
          fetchedAt: SEARCHED_AT,
          catalogue: {
            bookable: [],
            unbookable: listed.bookable.map((showtime) => ({
              showtime,
              reason: "soldOut",
            })),
            unidentified: [],
          },
        }),
    });
    const verified = await run.verify();

    expect(verified.ok).toBe(false);
    expect(verified.ok || verified.reason).toBe("taken");
    expect(alternativesIn(verified)).toEqual([]);
    expect(run.auditoriumsRead()).toEqual([]);
  });

  it("re-reads the Auditorium when the listing has since dropped the Format the Query named", async () => {
    const run = await verifying({
      formats: ["Dolby Cinema"],
      store: (listed) =>
        holding({
          fetchedAt: SEARCHED_AT,
          catalogue: {
            ...listed,
            bookable: listed.bookable.map((showtime) => ({
              ...showtime,
              presentation: { ...showtime.presentation, formats: [] },
            })),
          },
        }),
    });
    const verified = await run.verify();

    expect(verified.ok).toBe(true);
    expect(run.auditoriumsRead()).toHaveLength(1);
  });
});
