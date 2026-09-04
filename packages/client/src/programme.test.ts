import { openSource, type Reading } from "@seatscout/core";
import { type UpstreamScript, fakeUpstream } from "@seatscout/core/testing";
import { describe, expect, it } from "vitest";
import { openProgramme, type Programme } from "./programme.js";
import { inMemoryStore } from "./store.js";

const AREA = "75006";
const TODAY = "2026-08-28";
const TOMORROW = "2026-08-29";
const AT = 1000;
const TWO_HOURS = 7_200_000;
const NEARBY = "/napi/nearbyTheaters";
const SCHEDULES = "/napi/theaterMovieShowtimes/";

const PLAYING_AT_THE_ANCHOR = [
  "American Martyr: The Stanley Rother Story (2026)",
  "Colony (2026)",
  "Coyote vs. Acme",
  "GHOST: 2 Big To Rig (2026)",
  "Harry Potter and the Sorcerer's Stone (2001)",
  "Insidious: Out of the Further (2026)",
  "Irumudi (2026)",
  "Mutiny (2026)",
  "PAW Patrol: The Dino Movie (2026)",
  "Spider-Man: Brand New Day (2026)",
  "The Dog Stars (2026)",
  "The End of Oak Street (2026)",
  "The Fast And The Furious: 25th Anniversary (2026)",
  "The Odyssey (2026)",
  "Toxic: A Fairytale for Grownups (2026)",
];

const payloadOf = (reading: Reading<Programme>): Programme => {
  if (!reading.ok) throw new Error(`the programme answered ${reading.reason}`);
  return reading.payload;
};

const opened = (script: Omit<UpstreamScript, "seed"> = {}) => {
  const clock = { at: AT };
  const upstream = fakeUpstream({ seed: 4, standInTheaters: true, ...script });
  const deps = {
    fetch: upstream,
    now: () => clock.at,
    wait: () => Promise.resolve(),
    random: () => 0.5,
  };
  return {
    clock,
    programme: openProgramme({
      source: openSource(deps),
      store: inMemoryStore(),
      now: () => clock.at,
    }),
    requested: () => ({
      areas: upstream.requests.filter((request) =>
        request.path.startsWith(NEARBY),
      ).length,
      schedules: upstream.requests.filter((request) =>
        request.path.startsWith(SCHEDULES),
      ).length,
    }),
  };
};

describe("the programme near an area on a date", () => {
  it("names the Theaters near the area and the Movies playing at them, each Movie once, in title order", async () => {
    const { programme, requested } = opened();

    const read = payloadOf(await programme(AREA, TODAY));

    expect(read.theaters).toHaveLength(25);
    expect(read.theaters[0]?.name).toBe("Cinemark Dallas XD and IMAX");
    expect(read.movies.map((movie) => movie.title)).toEqual(
      PLAYING_AT_THE_ANCHOR,
    );
    expect(
      read.movies.find((movie) => movie.title === "The Dog Stars (2026)"),
    ).toEqual({ id: "245569", title: "The Dog Stars (2026)" });
    expect(read.unreached).toEqual([]);
    expect(requested()).toEqual({ areas: 1, schedules: 25 });
  });

  it("names the Theaters whose schedule could not be read and answers with the rest", async () => {
    const { programme } = opened({
      sequences: {
        [`${SCHEDULES}aacbt`]: [500, 500, 500],
        [`${SCHEDULES}aaxju`]: [500, 500, 500],
      },
    });

    const read = payloadOf(await programme(AREA, TODAY));

    expect(read.unreached.map((theater) => theater.name)).toEqual([
      "Cinemark Dallas XD and IMAX",
      "AMC Village on the Parkway 9",
    ]);
    expect(read.theaters).toHaveLength(25);
    expect(read.movies).toHaveLength(PLAYING_AT_THE_ANCHOR.length);
  });

  it("refuses the whole read when the area cannot be read", async () => {
    const { programme, requested } = opened({
      sequences: { [NEARBY]: [500, 500, 500] },
    });

    const reading = await programme(AREA, TODAY);

    expect(reading.ok).toBe(false);
    expect(requested()).toEqual({ areas: 3, schedules: 0 });
  });

  it("answers a second read inside two hours from the device and reads the Source once", async () => {
    const { programme, clock, requested } = opened();
    const first = await programme(AREA, TODAY);
    clock.at += TWO_HOURS - 1;
    const second = await programme(AREA, TODAY);

    expect(requested()).toEqual({ areas: 1, schedules: 25 });
    expect(second).toEqual({
      ok: true,
      payload: payloadOf(first),
      fetchedAt: AT,
      attempts: 0,
    });
  });

  it("reads the Source again once two hours have passed", async () => {
    const { programme, clock, requested } = opened();
    await programme(AREA, TODAY);
    clock.at += TWO_HOURS;
    await programme(AREA, TODAY);

    expect(requested()).toEqual({ areas: 2, schedules: 50 });
  });

  it("gives an area and a date their own entry each", async () => {
    const { programme, requested } = opened();
    await programme(AREA, TODAY);
    await programme(AREA, TOMORROW);
    await programme("75201", TODAY);

    expect(requested()).toEqual({ areas: 3, schedules: 75 });
  });

  it("keeps no read that missed a Theater, so the next asks the Source again", async () => {
    const { programme, requested } = opened({
      sequences: { [`${SCHEDULES}aacbt`]: [500, 500, 500] },
    });
    await programme(AREA, TODAY);
    await programme(AREA, TODAY);

    expect(requested()).toEqual({ areas: 2, schedules: 24 + 3 + 25 });
  });
});
