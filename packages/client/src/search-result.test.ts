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
      rooms: ["561562311"],
    });
    const accessible = await searching({
      at: [STONEBRIAR],
      rooms: ["561562311"],
      accessibleSeating: true,
    });

    expect((await ordinary.search.done).results[0]?.removed).toEqual({
      unavailable: 27,
      accessible: 5,
    });
    expect((await accessible.search.done).results[0]?.removed).toEqual({
      unavailable: 27,
      accessible: 0,
    });
  });

  it("carries no ticketing URL on a result", async () => {
    const settled = await (await searching({ at: [STONEBRIAR] })).search.done;
    const result = settled.results[0];

    expect(result?.showtime).toEqual({
      id: 558117351,
      startsAt: expect.any(String),
      presentation: expect.any(Object),
    });
    expect(Object.keys(result?.showtime ?? {})).not.toContain("ticketing");
  });

  it("answers one Seat Group per Showtime, the best the room holds", async () => {
    const run = await searching({
      at: [STONEBRIAR],
      rooms: ["561562311", "561755033", "561783660", "558983758"],
    });
    const settled = await run.search.done;
    const result = settled.results.find(
      (found) => found.showtime.id === 558117351,
    );

    expect(settled.results).toHaveLength(4);
    expect(result?.seats.map((seat) => seat.id)).toEqual(["F9", "F8"]);
    expect(result?.podDividers).toBe(0);
    expect(result?.key).toBe("558117351:F9+F8");
    expect(result?.reasons).toEqual({
      againstWall: false,
      inFrontBand: false,
      rowCount: 8,
      rowFromFront: 6,
      seatsOffCentre: -1.9503424657534258,
      tiedAtRoomResolution: false,
    });
  });

  it("carries the room's seat count and its row plan on every result", async () => {
    const run = await searching({
      at: [STONEBRIAR],
      rooms: ["561562311"],
    });
    const settled = await run.search.done;
    const result = settled.results[0];

    expect(result?.seatCount).toBe(99);
    expect(result?.plan).toHaveLength(8);
    expect(result?.plan[0]?.runs).toHaveLength(3);
    expect(result?.plan[0]?.depth).toBe(0);
    expect(result?.plan.at(-1)?.depth).toBe(1);
  });

  it("orders Showtimes that score alike by the Showtime they are", async () => {
    const run = await searching({
      at: [STONEBRIAR],
      rooms: ["561562311", "561562311", "561562311", "561562311"],
    });
    const settled = await run.search.done;

    expect(new Set(settled.results.map((result) => result.score)).size).toBe(1);
    expect(idsIn(settled)).toEqual([
      557985744, 558117351, 558782900, 558782901,
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
    expect(settled.coverage.checked).toBe(4);
    expect(accountedIn(settled.coverage)).toBe(5);
  });
});
