import { describe, expect, it } from "vitest";
import { STONEBRIAR, searching, VILLAGE } from "./search.fixtures.js";

const WEST_PLANO_10 = "562212808";

const resultOf = async (rooms: readonly string[]) => {
  const run = await searching({ at: [STONEBRIAR], rooms });
  const settled = await run.search.done;
  const result = settled.results.find(
    (found) => found.showtime.id === 564362581,
  );
  if (result === undefined) throw new Error("the room offered nothing");
  return { search: run.search, result };
};

describe("the Auditorium a search opens for a result", () => {
  it("answers the room the recommendation was computed on, rows front to back with the recommended Seat Group placed", async () => {
    const { search, result } = await resultOf([WEST_PLANO_10]);
    const auditorium = search.auditorium(result);
    const row = auditorium.map.rows[7];

    expect(result.seats.map((seat) => seat.id)).toEqual(["N14", "N13"]);
    expect(auditorium.map.rows).toHaveLength(14);
    expect(auditorium.map.seatCount).toBe(303);
    expect(auditorium.map.bookableCount).toBe(266);
    expect(auditorium.recommended.row.ordinalFromFront).toBe(13);
    expect(auditorium.recommended.seat.id).toBe("N14");
    expect(row?.ordinalFromFront).toBe(8);
    expect(row?.label).toBe("H");
    expect(row?.seats[9]?.id).toBe("H14");
    expect(row?.seats[10]?.id).toBe("H13");
  });

  it("carries the room's ranked Seat Groups as results, the recommended one first", async () => {
    const { search, result } = await resultOf([WEST_PLANO_10]);
    const auditorium = search.auditorium(result);

    expect(auditorium.offered.map((offered) => offered.key)).toEqual([
      "564362581:N14+N13",
      "564362581:E14+E13",
      "564362581:K21+K20",
      "564362581:K7+K6",
      "564362581:L8+L7",
      "564362581:L21+L20",
      "564362581:D14+D13",
      "564362581:M20+M19",
      "564362581:M7+M6",
      "564362581:J6+J5",
      "564362581:C14+C13",
      "564362581:F9+F8",
      "564362581:J21+J20",
      "564362581:F20+F19",
      "564362581:H24+H23",
      "564362581:H3+H2",
      "564362581:P20+P19",
      "564362581:P7+P6",
      "564362581:G4+G3",
      "564362581:A13+A12",
      "564362581:G24+G23",
      "564362581:B20+B19",
      "564362581:B7+B6",
    ]);
    expect(auditorium.offered[0]).toEqual(result);
    expect(auditorium.offered[1]?.terms).toEqual(result.terms);
  });

  it("refuses a Seat Group the room does not hold", async () => {
    const { search, result } = await resultOf([WEST_PLANO_10]);
    const elsewhere = {
      ...result,
      seats: result.seats.map((seat) => ({ ...seat, id: `Z${seat.id}` })),
    };

    expect(() => search.auditorium(elsewhere)).toThrow(
      "the Seat Group is not in the room of Showtime 564362581",
    );
  });

  it("refuses a result from a room it never read", async () => {
    const { search } = await resultOf([WEST_PLANO_10]);
    const elsewhere = await (await searching({ at: [VILLAGE] })).search.done;
    const other = elsewhere.results[0];
    if (other === undefined)
      throw new Error("the other search offered nothing");

    expect(other.showtime.id).not.toBe(564362581);
    expect(() => search.auditorium(other)).toThrow(
      `this search never read the room of Showtime ${other.showtime.id}`,
    );
  });
});
