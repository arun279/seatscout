import { describe, expect, it } from "vitest";
import { type Catalogue, narrowed } from "./catalogue.js";
import { captured, counted, everyShowtime } from "./catalogue.fixtures.js";

const startsAt = (catalogue: Catalogue): readonly string[] =>
  everyShowtime(catalogue)
    .map((showtime) => showtime.startsAt.slice(0, 16))
    .toSorted();

describe("narrowing a catalogue to a time window", () => {
  it("keeps a Showtime that starts at the opening of the window and drops one that starts at its close", () => {
    const catalogue = captured();

    expect([startsAt(catalogue)[0], startsAt(catalogue).at(-1)]).toEqual([
      "2026-08-28T09:00",
      "2026-08-28T23:25",
    ]);
    expect(
      [
        { from: "2026-08-28T09:00" },
        { from: "2026-08-28T09:01" },
        { until: "2026-08-28T23:25" },
        { until: "2026-08-28T23:26" },
      ].map((window) => everyShowtime(narrowed(catalogue, window)).length),
    ).toEqual([176, 175, 175, 176]);
  });

  it("narrows to an evening window across every Theater at once, by each Theater's own clock", () => {
    const catalogue = captured();
    const kept = narrowed(catalogue, {
      from: "2026-08-28T19:00",
      until: "2026-08-28T22:00",
    });

    expect(counted(kept)).toEqual({
      bookable: 46,
      unbookable: 0,
      unidentified: 0,
    });
  });

  it("admits a Showtime after midnight to a window that opens late in the evening", () => {
    const [first] = captured().bookable;
    if (first === undefined) throw new Error("the capture holds no Showtimes");
    const late: Catalogue = {
      bookable: [{ ...first, startsAt: "2026-08-29T00:15:00-05:00" }],
      unbookable: [],
      unidentified: [],
    };

    expect(
      [
        { from: "2026-08-28T22:00" },
        { until: "2026-08-28T23:00" },
        { from: "2026-08-28T22:00", until: "2026-08-29T01:00" },
      ].map((window) => narrowed(late, window).bookable.length),
    ).toEqual([1, 0, 1]);
  });
});
