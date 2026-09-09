import { describe, expect, it } from "vitest";
import {
  nearbyTheatersCaptures,
  showtimeGroupingCaptures,
  theaterMovieShowtimesCaptures,
} from "../corpus/captures.js";
import { answerOf, FETCHED_AT } from "./contract.fixtures.js";
import {
  type Answer,
  areaDivergencesIn,
  divergencesIn,
  listingDivergencesIn,
  scheduleDivergencesIn,
} from "./contract.js";

const scheduleCapture = () => {
  const capture = theaterMovieShowtimesCaptures.get(
    "showtimes/theater-showtimes-aacbt-2026-08-28.json",
  );
  if (capture === undefined) throw new Error("the schedule was never captured");
  return capture.body;
};

const listingCapture = () => {
  const capture = showtimeGroupingCaptures.get(
    "showtimes/grouping-245569-2026-08-28.json",
  );
  if (capture === undefined) throw new Error("the listing was never captured");
  return capture.body;
};

const identifiedNowhere = (body: unknown): Answer => ({
  status: 200,
  body: JSON.stringify(body, (key, value) =>
    key === "id" ? undefined : value,
  ),
  fetchedAt: FETCHED_AT,
});

const sellingAs = (word: string | undefined): Answer => ({
  status: 200,
  body: JSON.stringify(listingCapture(), (key, value) =>
    key === "type" ? word : value,
  ),
  fetchedAt: FETCHED_AT,
});

const areaCapture = () => {
  const capture = nearbyTheatersCaptures.get("theaters/nearby-theaters.json");
  if (capture === undefined) throw new Error("the area was never captured");
  return capture.body;
};

describe("the contract an area and a listing recorded", () => {
  it("finds nothing diverging in a captured area or a captured listing", () => {
    expect([
      ...areaDivergencesIn(answerOf(areaCapture(), 200)),
      ...listingDivergencesIn(answerOf(listingCapture(), 200)),
    ]).toEqual([]);
  });

  it("names the area and the listing it could not read into domain objects", () => {
    const area = areaCapture();
    const listing = listingCapture();

    expect(
      areaDivergencesIn(
        answerOf({ ...area, theaters: [...area.theaters, {}] }, 200),
      ),
    ).toEqual([{ kind: "missing", name: "theaters" }]);
    expect(
      listingDivergencesIn(answerOf({ ...listing, theaterShowtimes: {} }, 200)),
    ).toEqual([{ kind: "missing", name: "catalogue" }]);
  });

  it("says so when an answer is not JSON at all", () => {
    const answer: Answer = {
      status: 200,
      body: "<html>not today</html>",
      fetchedAt: FETCHED_AT,
    };

    expect([
      ...areaDivergencesIn(answer),
      ...listingDivergencesIn(answer),
    ]).toEqual([
      { kind: "unreadable", name: "json" },
      { kind: "unreadable", name: "json" },
    ]);
  });

  it("judges a seat map only when the Source answered one", () => {
    expect(
      divergencesIn({
        status: 500,
        body: "<html>we are having trouble</html>",
        fetchedAt: FETCHED_AT,
      }),
    ).toEqual([]);
  });

  it("says so when an area or a listing arrives with nothing in it", () => {
    const area = areaCapture();

    expect(areaDivergencesIn(answerOf({ ...area, theaters: [] }, 200))).toEqual(
      [{ kind: "empty", name: "theaters" }],
    );
    expect(
      listingDivergencesIn(
        answerOf({ theaterShowtimes: { theaters: [] } }, 200),
      ),
    ).toEqual([{ kind: "empty", name: "catalogue" }]);
  });

  it("names a Showtime a request would be spent on that does not say it is on sale", () => {
    expect({
      "the word the corpus recorded": listingDivergencesIn(
        sellingAs("available"),
      ),
      "the word for a Theater that has stopped selling": listingDivergencesIn(
        sellingAs("disabled"),
      ),
      "a word nobody has met": listingDivergencesIn(sellingAs("reopening")),
      "no word at all": listingDivergencesIn(sellingAs(undefined)),
    }).toEqual({
      "the word the corpus recorded": [],
      "the word for a Theater that has stopped selling": [],
      "a word nobody has met": [{ kind: "sellability", name: "reopening" }],
      "no word at all": [{ kind: "missing", name: "sellability" }],
    });
  });

  it("judges a Theater's schedule the way it judges an area: unreadable, short of a Movie, or empty", () => {
    const schedule = scheduleCapture();
    const { viewModel } = schedule;

    expect(scheduleDivergencesIn(answerOf(schedule, 200))).toEqual([]);
    expect(
      scheduleDivergencesIn({
        status: 200,
        body: "<html>not today</html>",
        fetchedAt: FETCHED_AT,
      }),
    ).toEqual([{ kind: "unreadable", name: "json" }]);
    expect(
      scheduleDivergencesIn(
        answerOf(
          { viewModel: { ...viewModel, movies: [...viewModel.movies, {}] } },
          200,
        ),
      ),
    ).toEqual([{ kind: "missing", name: "movies" }]);
    expect(
      scheduleDivergencesIn(
        answerOf({ viewModel: { ...viewModel, movies: [] } }, 200),
      ),
    ).toEqual([{ kind: "empty", name: "movies" }]);
  });

  it("counts a Showtime a listing holds whether or not it was identified", () => {
    expect(listingDivergencesIn(identifiedNowhere(listingCapture()))).toEqual(
      [],
    );
    expect(
      listingDivergencesIn(
        identifiedNowhere({ theaterShowtimes: { theaters: [] } }),
      ),
    ).toEqual([{ kind: "empty", name: "catalogue" }]);
  });
});
