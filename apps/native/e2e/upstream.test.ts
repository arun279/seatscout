import { describe, expect, it } from "@jest/globals";
import { createSeatScout } from "@seatscout/client";
import { reaching } from "../src/host/source.js";
import { upstream } from "./upstream.js";

describe("the Source the journey reads", () => {
  it("offers the film the journey picks among those playing near the area it asks about", async () => {
    const seatscout = createSeatScout({
      fetch: reaching(upstream),
      now: () => 0,
      wait: () => Promise.resolve(),
      random: () => 0,
    });

    const reading = await seatscout.programme("75006", "2026-08-28");

    expect(reading).toMatchObject({ ok: true });
    expect(
      reading.ok && reading.payload.movies.map((movie) => movie.title),
    ).toContain("The Dog Stars (2026)");
  });
});
