import { fakeUpstream } from "@seatscout/core/testing";
import { describe, expect, it } from "vitest";
import { createSeatScout } from "./seatscout.js";

const AT = 1000;
const LISTING = "/napi/theaterShowtimeGroupings/245893/2026-09-20";

const TONIGHT = {
  movie: "245893",
  dates: ["2026-09-20"],
  area: "75006",
  partySize: 2,
  accessibleSeating: false,
};

describe("the limits a SeatScout ships with", () => {
  it("stop asking for five seconds once three listings in a row have failed every attempt", async () => {
    const upstream = fakeUpstream({
      seed: 4,
      sequences: { [LISTING]: Array(9).fill(500) },
    });
    const clock = { at: AT };
    const seatscout = createSeatScout({
      fetch: upstream,
      now: () => clock.at,
      wait: () => Promise.resolve(),
      random: () => 0.5,
    });
    const searched = () => seatscout.search(TONIGHT).done;
    await searched();
    await searched();
    await searched();
    const tripped = upstream.requests.length;

    await searched();
    clock.at = AT + 4999;
    await searched();
    const held = upstream.requests.length;
    clock.at = AT + 5000;
    await searched();

    expect(tripped).toBe(9);
    expect(held).toBe(9);
    expect(upstream.requests.length).toBeGreaterThan(9);
  });
});
