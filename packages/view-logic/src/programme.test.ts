import { createSeatScout, type Movie } from "@seatscout/client";
import { fakeUpstream, type UpstreamScript } from "@seatscout/client/testing";
import { describe, expect, it } from "vitest";
import {
  movieOf,
  programmeNear,
  suggestedFor,
  theaterNamed,
  titleOf,
} from "./programme.js";

const PLAYING: readonly Movie[] = [
  { id: "23184", title: "Akira" },
  { id: "246840", title: "Akira 4K Re-Release (2026)" },
  { id: "245476", title: "Colony (2026)" },
  { id: "246329", title: "Coyote vs. Acme" },
];

const NEARBY = "/napi/nearbyTheaters";

const near = (
  area: string | undefined,
  script: Omit<UpstreamScript, "seed"> = {},
) => {
  const seatscout = createSeatScout({
    fetch: fakeUpstream({ seed: 4, standInTheaters: true, ...script }),
    now: () => 1000,
    wait: () => Promise.resolve(),
    random: () => 0.5,
  });
  const asked: (readonly [string, string])[] = [];
  const readings: Promise<unknown>[] = [];
  const held = programmeNear(
    {
      ...seatscout,
      programme: (from, on) => {
        asked.push([from, on]);
        const reading = seatscout.programme(from, on);
        readings.push(reading);
        return reading;
      },
    },
    area,
    "2026-08-28",
  );
  return { held, asked, read: () => Promise.all(readings) };
};

describe("the films playing near an area", () => {
  it("names the one a query asks for, and nothing for one that is not playing", () => {
    expect(titleOf(PLAYING, "246329")).toBe("Coyote vs. Acme");
    expect(titleOf(PLAYING, "999999")).toBeUndefined();
    expect(titleOf(PLAYING, undefined)).toBeUndefined();
  });

  it("takes a title typed whole, whatever its case and whatever space surrounds it", () => {
    expect(movieOf("Coyote vs. Acme", PLAYING)).toBe("246329");
    expect(movieOf("  coyote vs. acme  ", PLAYING)).toBe("246329");
    expect(movieOf("coyote", PLAYING)).toBeUndefined();
  });

  it("takes a film's number only where the whole of what was typed is one", () => {
    expect(movieOf(" 245569 ", PLAYING)).toBe("245569");
    for (const almost of ["245569x", "x245569", "24 5569", ""])
      expect(movieOf(almost, PLAYING)).toBeUndefined();
  });

  it("offers every film the typed letters appear in, wherever they appear", () => {
    expect(suggestedFor("co", PLAYING).map((movie) => movie.title)).toEqual([
      "Colony (2026)",
      "Coyote vs. Acme",
    ]);
    expect(suggestedFor("  co  ", PLAYING).map((movie) => movie.title)).toEqual(
      ["Colony (2026)", "Coyote vs. Acme"],
    );
    expect(suggestedFor("acme", PLAYING).map((movie) => movie.title)).toEqual([
      "Coyote vs. Acme",
    ]);
  });

  it("offers nothing for nothing typed, and nothing once one title is typed whole even where it opens another", () => {
    expect(suggestedFor("", PLAYING)).toEqual([]);
    expect(suggestedFor("   ", PLAYING)).toEqual([]);
    expect(suggestedFor("Akira", PLAYING)).toEqual([]);
    expect(suggestedFor("Akira 4", PLAYING)).toHaveLength(1);
  });
});

describe("the programme held for an area and a date", () => {
  it("holds nothing and reads nothing while no area is named", () => {
    const { held, asked } = near(undefined);

    expect(held.area).toBeUndefined();
    expect(held.date).toBe("2026-08-28");
    expect(held.snapshot()).toEqual({
      phase: "none",
      theaters: [],
      movies: [],
    });
    expect(asked).toEqual([]);
  });

  it("says it is reading from the moment an area is named, and asks for that area on that date once", () => {
    const { held, asked } = near("75006");

    expect(held.area).toBe("75006");
    expect(held.date).toBe("2026-08-28");
    expect(held.snapshot()).toEqual({
      phase: "reading",
      theaters: [],
      movies: [],
    });
    expect(asked).toEqual([["75006", "2026-08-28"]]);
  });

  it("names the Theaters and the Movies once the programme is read, and tells a listener once, after it holds them", async () => {
    const { held, read } = near("75006");
    const heard: string[] = [];
    held.subscribe(() => heard.push(held.snapshot().phase));

    await read();

    const { phase, theaters, movies } = held.snapshot();
    expect(heard).toEqual(["read"]);
    expect(phase).toBe("read");
    expect(theaters).toHaveLength(25);
    expect(movies).toHaveLength(15);
    expect(titleOf(movies, "245569")).toBe("The Dog Stars (2026)");
  });

  it("names a Theater a query asks for, and states its identity where the programme does not hold it", async () => {
    const { held, read } = near("75006");
    await read();

    const { theaters } = held.snapshot();
    expect(theaterNamed(theaters, "aacbt")).toBe("Cinemark Dallas XD and IMAX");
    expect(theaterNamed(theaters, "aaxju")).toBe(
      "AMC Village on the Parkway 9",
    );
    expect(theaterNamed(theaters, "zzzzz")).toBe("zzzzz");
    expect(theaterNamed([], "aacbt")).toBe("aacbt");
  });

  it("says the programme is unreachable when the area cannot be read, and holds no Theater and no Movie", async () => {
    const { held, read } = near("75006", {
      sequences: { [NEARBY]: [500, 500, 500] },
    });
    const heard: string[] = [];
    held.subscribe(() => heard.push(held.snapshot().phase));

    await read();

    expect(heard).toEqual(["unreachable"]);
    expect(held.snapshot()).toEqual({
      phase: "unreachable",
      theaters: [],
      movies: [],
    });
  });

  it("stops telling a listener that has left", async () => {
    const { held, read } = near("75006");
    const heard: string[] = [];
    const leave = held.subscribe(() => heard.push(held.snapshot().phase));

    leave();
    await read();

    expect(heard).toEqual([]);
    expect(held.snapshot().phase).toBe("read");
  });
});
