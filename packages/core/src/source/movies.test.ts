import { describe, expect, it } from "vitest";
import {
  showtimeGroupingCaptures,
  theaterMovieShowtimesCaptures,
} from "../corpus/captures.js";
import {
  answering,
  instead,
  payloadOf,
  rig,
  sourced,
  TODAY,
  without,
} from "./catalogue.fixtures.js";

const ANCHOR = "aacbt";
const ROUTE = `/napi/theaterMovieShowtimes/${ANCHOR}`;

const anchorCapture = () => {
  const capture = theaterMovieShowtimesCaptures.get(
    "showtimes/theater-showtimes-aacbt-2026-08-28.json",
  );
  if (capture === undefined)
    throw new Error("the anchor Theater's schedule was never captured");
  return capture.body;
};

const readingOf = (body: unknown) =>
  sourced(answering(ROUTE, body)).moviesAt(ANCHOR, TODAY);

describe("the Movies playing at a Theater", () => {
  it("turns a Theater and a date into the Movies playing there, each titled beside the identity a listing is asked by", async () => {
    const movies = payloadOf(await sourced().moviesAt(ANCHOR, TODAY));

    expect(movies).toHaveLength(15);
    expect(movies[0]).toEqual({ id: "245476", title: "Colony (2026)" });
    expect(movies.find((movie) => movie.id === "245569")?.title).toBe(
      "The Dog Stars (2026)",
    );
    expect(
      [...new Set(movies.flatMap((movie) => Object.keys(movie)))].toSorted(),
    ).toEqual(["id", "title"]);
  });

  it("asks for the date and no chain code, because the code changes nothing the Source answers", async () => {
    const { fetch, source } = rig();

    await source.moviesAt(ANCHOR, TODAY);

    expect(fetch.requests.map((request) => request.path)).toEqual([
      `${ROUTE}?startDate=${TODAY}&isdesktop=true&partnerRestrictedTicketing=`,
    ]);
  });

  it("names every Movie the captured listings were asked by", async () => {
    const asked = [...showtimeGroupingCaptures.keys()].flatMap(
      (file) => /grouping-(\d+)-/.exec(file)?.[1] ?? [],
    );
    const playing = payloadOf(await sourced().moviesAt(ANCHOR, TODAY)).map(
      (movie) => movie.id,
    );

    expect(asked).toEqual(["243819", "245569", "245569", "246329", "246427"]);
    expect(asked.filter((movie) => !playing.includes(movie))).toEqual([]);
  });

  it("refuses a whole answer that is missing anything a Movie is built from", async () => {
    const fields = ["viewModel", "movies", "id", "title"];
    const refused: string[] = [];
    for (const field of fields)
      if (!(await readingOf(without(anchorCapture(), field))).ok)
        refused.push(field);

    expect(refused).toEqual(fields);
  });

  it("refuses an identity that is not a number and a title that is not a string", async () => {
    const wrong: readonly (readonly [string, unknown])[] = [
      ["id", "245476"],
      ["id", null],
      ["title", 7],
      ["title", null],
    ];
    const refused: unknown[] = [];
    for (const [field, value] of wrong)
      if (!(await readingOf(instead(anchorCapture(), field, value))).ok)
        refused.push([field, value]);

    expect(refused).toEqual(wrong);
  });

  it("answers a Theater with nothing playing as no Movies rather than a refusal", async () => {
    const movies = payloadOf(
      await readingOf(instead(anchorCapture(), "movies", [])),
    );

    expect(movies).toEqual([]);
  });
});
