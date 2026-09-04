import { describe, expect, it } from "vitest";
import {
  seatMapCaptures,
  theaterMovieShowtimesCaptures,
} from "../corpus/captures.js";
import { fakeUpstream } from "./fake-upstream.js";

describe("what the fake upstream stands in for a route the corpus never recorded", () => {
  it("stands a captured Auditorium in for a seat map, the same one every time", async () => {
    const auditoriums = new Set(
      [...seatMapCaptures.values()].map((capture) =>
        JSON.stringify(capture.body),
      ),
    );
    const fetch = fakeUpstream({ seed: 1, standInAuditoriums: true });

    const first = await fetch("/napi/seatMap/000000001");
    const again = await fetch("/napi/seatMap/000000001");
    const other = await fetch("/napi/seatMap/000000002");
    const soldOut = await fetch("/napi/seatMap/561549583");
    const [firstBody, againBody, otherBody] = await Promise.all([
      first.text(),
      again.text(),
      other.text(),
    ]);

    expect([first.status, again.status, other.status]).toEqual([200, 200, 200]);
    expect(auditoriums.has(firstBody)).toBe(true);
    expect(auditoriums.has(otherBody)).toBe(true);
    expect(againBody).toBe(firstBody);
    expect(otherBody).not.toBe(firstBody);
    expect(soldOut.status).toBe(410);
    for (const elsewhere of [
      "/napi/theaterMovies/aacbt",
      "/napi/theaterMovieShowtimes/another",
      "/napi/theaters/561478479",
      "/napi/seatMap/",
      "/napi/seatMap/561478479/extra",
      "/elsewhere/napi/seatMap/561478479",
    ])
      await expect(fetch(elsewhere)).rejects.toThrow(elsewhere);
  });

  it("stands the one captured Theater schedule in for a Theater, and for no other route", async () => {
    const [captured] = [...theaterMovieShowtimesCaptures.values()];
    const fetch = fakeUpstream({ seed: 1, standInTheaters: true });

    const other = await fetch(
      "/napi/theaterMovieShowtimes/another?startDate=2026-08-28",
    );
    const anchor = await fetch(
      "/napi/theaterMovieShowtimes/aacbt?startDate=2026-08-28",
    );

    expect([other.status, anchor.status]).toEqual([200, 200]);
    expect(JSON.parse(await other.text())).toEqual(captured?.body);
    expect(JSON.parse(await anchor.text())).toEqual(captured?.body);
    for (const elsewhere of [
      "/napi/seatMap/000000001",
      "/napi/theaterMovies/another",
      "/napi/theaterMovieShowtimes/",
      "/napi/theaterMovieShowtimes/another/extra",
    ])
      await expect(fetch(elsewhere)).rejects.toThrow(elsewhere);
  });
});
