import { REFERENCE, type SeatProfile } from "@seatscout/core";
import { describe, expect, it } from "vitest";
import {
  accountedIn,
  arrivalIn,
  idsIn,
  STONEBRIAR,
  searching,
} from "./search.fixtures.js";

describe("the result a search hands back", () => {
  it("reports what the filters removed from the room it ranked", async () => {
    const ordinary = await searching({
      at: [STONEBRIAR],
      rooms: ["564442282"],
    });
    const accessible = await searching({
      at: [STONEBRIAR],
      rooms: ["564442282"],
      accessibleSeating: true,
    });

    expect((await ordinary.search.done).results[0]?.removed).toEqual({
      unavailable: 7,
      accessible: 8,
    });
    expect((await accessible.search.done).results[0]?.removed).toEqual({
      unavailable: 7,
      accessible: 0,
    });
  });

  it("carries no ticketing URL on a result", async () => {
    const settled = await (await searching({ at: [STONEBRIAR] })).search.done;
    const result = settled.results[0];

    expect(result?.showtime).toEqual({
      id: 564362530,
      startsAt: expect.any(String),
      presentation: expect.any(Object),
    });
    expect(Object.keys(result?.showtime ?? {})).not.toContain("ticketing");
  });

  it("answers one Seat Group per Showtime, the best the room holds", async () => {
    const run = await searching({
      at: [STONEBRIAR],
      rooms: ["564442282", "564435732", "564270324", "562206728"],
    });
    const settled = await run.search.done;
    const result = settled.results.find(
      (found) => found.showtime.id === 564362581,
    );

    expect(settled.results).toHaveLength(18);
    expect(result?.seats.map((seat) => seat.id)).toEqual(["F5", "F6"]);
    expect(result?.podDividers).toBe(0);
    expect(result?.key).toBe("564362581:F5+F6");
    expect(result?.reasons).toEqual({
      rowFromFront: 6,
      rowCount: 9,
      seatsOffCentre: -0.6541755888650929,
      inFrontBand: false,
      againstWall: false,
      tiedAtRoomResolution: true,
    });
  });

  it("carries the room's seat count and its row plan on every result", async () => {
    const run = await searching({
      at: [STONEBRIAR],
      rooms: ["564442282"],
    });
    const settled = await run.search.done;
    const result = settled.results[0];

    expect(result?.seatCount).toBe(138);
    expect(result?.plan).toHaveLength(9);
    expect(result?.plan[0]?.runs).toHaveLength(3);
    expect(result?.plan[0]?.depth).toBe(0);
    expect(result?.plan.at(-1)?.depth).toBe(1);
  });

  it("orders Showtimes that score alike by the Showtime they are", async () => {
    const run = await searching({
      at: [STONEBRIAR],
      rooms: ["564442282", "564442282", "564442282", "564442282"],
    });
    const settled = await run.search.done;

    expect(new Set(settled.results.map((result) => result.score)).size).toBe(1);
    expect(idsIn(settled)).toEqual([
      562047982, 562047983, 562047984, 562047985, 562047986, 562047987,
      562047988, 562047989, 562047990, 562047991, 562047992, 564362530,
      564362531, 564362532, 564362541, 564362580, 564362581, 564362582,
    ]);
    expect(idsIn(settled)).not.toEqual(arrivalIn(run.snapshots));
  });

  it("scores against the Seat Profile it is given", async () => {
    const front: SeatProfile = { ...REFERENCE, targetDepth: 0 };
    const reference = await searching({ at: [STONEBRIAR] });
    const nearest = await searching({ at: [STONEBRIAR], profile: front });

    expect(idsIn(await reference.search.done)).not.toEqual(
      idsIn(await nearest.search.done),
    );
  });

  it("counts a Showtime whose room cannot seat the party as checked and offers no result", async () => {
    const run = await searching({ at: [STONEBRIAR], partySize: 400 });
    const settled = await run.search.done;

    expect(settled.results).toEqual([]);
    expect(settled.coverage.checked).toBe(18);
    expect(accountedIn(settled.coverage)).toBe(18);
  });
});
