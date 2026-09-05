import { describe, expect, it } from "vitest";
import { VILLAGE, searching, STONEBRIAR } from "./search.fixtures.js";

const WEST_PLANO_28 = "561865199";

const resultOf = async (rooms: readonly string[]) => {
  const run = await searching({ at: [STONEBRIAR], rooms });
  const settled = await run.search.done;
  const result = settled.results.find(
    (found) => found.showtime.id === 558117351,
  );
  if (result === undefined) throw new Error("the room offered nothing");
  return { search: run.search, result };
};

describe("the Auditorium a search opens for a result", () => {
  it("answers the room the recommendation was computed on, rows front to back with the recommended Seat Group placed", async () => {
    const { search, result } = await resultOf([WEST_PLANO_28]);
    const auditorium = search.auditorium(result);
    const row = auditorium.map.rows[7];

    expect(result.seats.map((seat) => seat.id)).toEqual(["H14", "H13"]);
    expect(auditorium.map.rows).toHaveLength(14);
    expect(auditorium.map.seatCount).toBe(304);
    expect(auditorium.map.bookableCount).toBe(25);
    expect(auditorium.map.recommended).toEqual({ row: 7, seats: [9, 10] });
    expect(auditorium.recommended).toEqual({ row: 7, seats: [9, 10] });
    expect(row?.ordinalFromFront).toBe(8);
    expect(row?.label).toBe("H");
    expect(row?.seats[9]?.id).toBe("H14");
    expect(row?.seats[10]?.id).toBe("H13");
  });

  it("carries the room's ranked Seat Groups as results, the recommended one first", async () => {
    const { search, result } = await resultOf([WEST_PLANO_28]);
    const auditorium = search.auditorium(result);

    expect(auditorium.offered.map((offered) => offered.key)).toEqual([
      "558117351:H14+H13",
      "558117351:G14+G13",
    ]);
    expect(auditorium.offered[0]).toEqual(result);
    expect(auditorium.offered[1]?.terms).toEqual(result.terms);
  });

  it("refuses a Seat Group the room does not hold", async () => {
    const { search, result } = await resultOf([WEST_PLANO_28]);
    const elsewhere = {
      ...result,
      seats: result.seats.map((seat) => ({ ...seat, id: `Z${seat.id}` })),
    };

    expect(() => search.auditorium(elsewhere)).toThrow(
      "the Seat Group is not in the room of Showtime 558117351",
    );
  });

  it("refuses a result from a room it never read", async () => {
    const { search } = await resultOf([WEST_PLANO_28]);
    const elsewhere = await (await searching({ at: [VILLAGE] })).search.done;
    const other = elsewhere.results[0];
    if (other === undefined)
      throw new Error("the other search offered nothing");

    expect(other.showtime.id).not.toBe(558117351);
    expect(() => search.auditorium(other)).toThrow(
      `this search never read the room of Showtime ${other.showtime.id}`,
    );
  });
});
