import { describe, expect, it } from "vitest";
import {
  AREA,
  alongside,
  answering,
  asTheSourceAnsweredIt,
  capturedRows,
  catalogueOf,
  counted,
  everyShowtime,
  GROUPINGS,
  grouping,
  groupingCapture,
  instead,
  NEARBY,
  nearbyCapture,
  payloadOf,
  readingOf,
  sourced,
  THEATERS_THE_SOURCE_STOPPED_IDENTIFYING,
  TODAY,
  WIDE_RELEASE,
  without,
} from "./catalogue.fixtures.js";

describe("the catalogue listing", () => {
  it("refuses a whole listing that is missing anything a Showtime is built from", async () => {
    const capture = groupingCapture(WIDE_RELEASE, TODAY);
    const route = grouping(WIDE_RELEASE, TODAY);
    const fields = [
      "amenities",
      "amenityGroups",
      "dateLocal",
      "expired",
      "formattedID",
      "hasReservedSeating",
      "isSoldOut",
      "movieID",
      "name",
      "showtimes",
      "theaterShowtimes",
      "theaters",
      "ticketingJumpPageURL",
      "variants",
    ];
    const refused: string[] = [];
    for (const field of fields) {
      const reading = await sourced(
        answering(route, without(capture, field)),
      ).showtimesFor(WIDE_RELEASE, TODAY, AREA);
      if (!reading.ok) refused.push(field);
    }

    expect(refused).toEqual(fields);
  });

  it("answers an area whose Theaters lost their Showtime identities rather than refusing it", async () => {
    const catalogue = payloadOf(await readingOf(asTheSourceAnsweredIt()));

    expect({
      bookable: catalogue.bookable.length,
      noSeatMap: counted(catalogue, "noSeatMap"),
      started: counted(catalogue, "started"),
      soldOut: counted(catalogue, "soldOut"),
      unidentified: catalogue.unidentified.length,
    }).toEqual({
      bookable: 100,
      noSeatMap: 3,
      started: 0,
      soldOut: 1,
      unidentified: 72,
    });
  });

  it("answers with every row every captured listing holds", async () => {
    const listed: number[] = [];
    const answered: number[] = [];
    for (const [movie, date] of GROUPINGS) {
      listed.push(
        capturedRows(groupingCapture(movie, date).theaterShowtimes.theaters)
          .length,
      );
      answered.push(everyShowtime(await catalogueOf(movie, date)).length);
    }

    expect(listed).toEqual([236, 80, 176, 175, 157]);
    expect(answered).toEqual(listed);
  });

  it("answers with every row the Source listed, whether or not the row was identified", async () => {
    const capture = groupingCapture(WIDE_RELEASE, TODAY);
    const listed = capturedRows(capture.theaterShowtimes.theaters).length;
    const whole = await catalogueOf(WIDE_RELEASE, TODAY);
    const partly = payloadOf(await readingOf(asTheSourceAnsweredIt()));
    const none = payloadOf(await readingOf(without(capture, "id")));

    expect(listed).toBe(176);
    expect([whole, partly, none].map((it) => everyShowtime(it).length)).toEqual(
      [listed, listed, listed],
    );
    expect([
      whole.unidentified.length,
      partly.unidentified.length,
      none.unidentified.length,
    ]).toEqual([0, 72, 172]);
  });

  it("asks why a Showtime is unbookable before it asks whether it was identified", async () => {
    const yesterday = "2026-08-27";
    const capture = groupingCapture(WIDE_RELEASE, yesterday);
    const catalogue = payloadOf(
      await sourced(
        answering(grouping(WIDE_RELEASE, yesterday), without(capture, "id")),
      ).showtimesFor(WIDE_RELEASE, yesterday, AREA),
    );

    expect({
      bookable: catalogue.bookable.length,
      noSeatMap: counted(catalogue, "noSeatMap"),
      started: counted(catalogue, "started"),
      unidentified: catalogue.unidentified.length,
    }).toEqual({ bookable: 0, noSeatMap: 3, started: 77, unidentified: 0 });
  });

  it("keeps the Presentation and the ticketing URL of a Showtime it cannot identify", async () => {
    const supplied = capturedRows(
      groupingCapture(WIDE_RELEASE, TODAY).theaterShowtimes.theaters.filter(
        (theater) =>
          THEATERS_THE_SOURCE_STOPPED_IDENTIFYING.includes(theater.name),
      ),
    );
    const catalogue = payloadOf(await readingOf(asTheSourceAnsweredIt()));

    expect(
      [
        ...new Set(
          catalogue.unidentified.flatMap((showtime) => Object.keys(showtime)),
        ),
      ].toSorted(),
    ).toEqual(["presentation", "startsAt", "ticketing"]);
    expect(
      catalogue.unidentified.map((showtime) => showtime.ticketing).toSorted(),
    ).toEqual(supplied.map((row) => row.ticketingJumpPageURL).toSorted());
    expect(
      [
        ...new Set(
          catalogue.unidentified.map(
            (showtime) => showtime.presentation.theater.name,
          ),
        ),
      ].toSorted(),
    ).toEqual(THEATERS_THE_SOURCE_STOPPED_IDENTIFYING);
  });

  it("refuses a whole listing whose identity is there and is not one", async () => {
    const capture = groupingCapture(WIDE_RELEASE, TODAY);
    const identities: readonly unknown[] = ["561528003", null, true];
    const refused: unknown[] = [];
    for (const identity of identities)
      if (!(await readingOf(instead(capture, "id", identity))).ok)
        refused.push(identity);

    expect(refused).toEqual(identities);
  });

  it("refuses a whole listing that carries one part it cannot read", async () => {
    const capture = groupingCapture(WIDE_RELEASE, TODAY);
    const route = grouping(WIDE_RELEASE, TODAY);
    const arrays = [
      "amenities",
      "amenityGroups",
      "showtimes",
      "theaters",
      "variants",
    ];
    const refused: string[] = [];
    for (const key of arrays) {
      const reading = await sourced(
        answering(route, alongside(capture, key, {})),
      ).showtimesFor(WIDE_RELEASE, TODAY, AREA);
      if (!reading.ok) refused.push(key);
    }

    expect(refused).toEqual(arrays);
  });

  it("refuses a whole area that carries one Theater it cannot read", async () => {
    const reading = await sourced(
      answering(NEARBY, alongside(nearbyCapture(), "theaters", {})),
    ).theatersNear(AREA);

    expect(reading.ok).toBe(false);
  });

  it("reports an area it could not decode rather than raising", async () => {
    const reading = await sourced({
      routes: { [NEARBY]: { status: 200, body: "<html>not today</html>" } },
    }).theatersNear(AREA);

    expect(reading).toEqual({
      ok: false,
      reason: "unreachable",
      fetchedAt: 1000,
      attempts: 3,
    });
  });

  it("reads a listing that is whole", async () => {
    const reading = await sourced(
      answering(
        grouping(WIDE_RELEASE, TODAY),
        without(groupingCapture(WIDE_RELEASE, TODAY), "amenityString"),
      ),
    ).showtimesFor(WIDE_RELEASE, TODAY, AREA);

    expect(payloadOf(reading).bookable).toHaveLength(172);
  });

  it("reports a Source it could not read rather than raising", async () => {
    const reading = await sourced({
      sequences: { [grouping(WIDE_RELEASE, TODAY)]: [500, 500, 500] },
    }).showtimesFor(WIDE_RELEASE, TODAY, AREA);

    expect(reading).toEqual({
      ok: false,
      reason: "unreachable",
      fetchedAt: 1000,
      attempts: 3,
    });
  });

  it("reports an answer it could not decode rather than raising", async () => {
    const reading = await sourced({
      routes: {
        [grouping(WIDE_RELEASE, TODAY)]: {
          status: 200,
          body: "<html>we are having trouble</html>",
        },
      },
    }).showtimesFor(WIDE_RELEASE, TODAY, AREA);

    expect(reading).toEqual({
      ok: false,
      reason: "unreachable",
      fetchedAt: 1000,
      attempts: 3,
    });
  });
});
