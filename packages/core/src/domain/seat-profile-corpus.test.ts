import { describe, expect, it } from "vitest";
import { seatMapCaptures } from "../corpus/captures.js";
import type { CapturedSeatMap } from "../corpus/types.js";
import { seatsFrom } from "../source/seat-map.js";
import { normalised } from "./auditorium.js";
import {
  type Auditorium,
  FETCHED_AT,
  judged,
  punishesTheFrontRowHarder,
  SEPARABLE,
  sweptWeightings,
} from "./seat-profile.fixtures.js";
import { REFERENCE, type SeatProfile } from "./seat-profile.js";

const BENCHMARK_AUDITORIUMS: readonly string[] = [
  "561443587",
  "561462741",
  "561505814",
  "561230736",
  "561865199",
];

const auditoriumOf = (body: CapturedSeatMap): Auditorium => {
  const seats = seatsFrom(JSON.stringify(body), FETCHED_AT);
  if (seats === null)
    throw new Error("the corpus holds a seat map that will not read");
  return normalised(seats);
};

const capturedAuditoriums = (): readonly Auditorium[] =>
  [...seatMapCaptures.values()].map((capture) => auditoriumOf(capture.body));

const benchmarkAuditorium = (showtime: string): Auditorium => {
  const capture = [...seatMapCaptures.values()].find(
    (one) => one.body.showtimeId === showtime,
  );
  if (capture === undefined)
    throw new Error(`the corpus holds no seat map for showtime ${showtime}`);
  return auditoriumOf(capture.body);
};

const acrossTheSweep = (
  rooms: readonly Auditorium[],
  grid: readonly Partial<SeatProfile>[],
) => {
  const judgements = grid.flatMap((weights) =>
    rooms.map((room) => {
      const profile = { ...REFERENCE, ...weights };
      return { profile, ...judged(room, profile) };
    }),
  );
  const offTargetRow = judgements.filter(
    (judgement) => !judgement.withinOneRowOfTarget,
  );
  return {
    points: judgements.length,
    centreline: judgements.filter((judgement) => judgement.onTheCentreline)
      .length,
    outward: judgements.filter((judgement) => judgement.fallingOutward).length,
    offTargetRow: offTargetRow.length,
    offTargetRowWhereDepthLeads: offTargetRow.filter(
      ({ profile }) => profile.depthWeight >= profile.offAxisWeight,
    ).length,
  };
};

describe("the Reference Seat Profile over the captured corpus", () => {
  it("puts its best Seat on the centreline within one row of the reference row, and falls away outward", () => {
    const captured = capturedAuditoriums().map((room) =>
      judged(room, REFERENCE),
    );

    expect({
      auditoriums: captured.length,
      onTheCentreline: captured.filter((room) => room.onTheCentreline).length,
      withinOneRowOfTarget: captured.filter((room) => room.withinOneRowOfTarget)
        .length,
      fallingOutward: captured.filter((room) => room.fallingOutward).length,
    }).toEqual({
      auditoriums: 42,
      onTheCentreline: 42,
      withinOneRowOfTarget: 42,
      fallingOutward: 42,
    });
  });

  it("punishes the same lateral offset harder in the front row than in the last, which the separable form it replaces does in none", () => {
    const captured = capturedAuditoriums();
    const holding = (profile: SeatProfile) =>
      captured.filter(
        (room) => punishesTheFrontRowHarder(room, profile) === true,
      ).length;

    const swept = (
      name: string,
      values: readonly number[],
      profileFor: (value: number) => SeatProfile,
    ) =>
      Object.fromEntries(
        values.map((value) => [`${name} ${value}`, holding(profileFor(value))]),
      );

    expect(
      swept("screen gap", [6, 9, 12, 16, 20, 24, 32, 48], (screenGap) => ({
        ...REFERENCE,
        screenGap,
      })),
    ).toEqual({
      "screen gap 6": 42,
      "screen gap 9": 42,
      "screen gap 12": 42,
      "screen gap 16": 42,
      "screen gap 20": 42,
      "screen gap 24": 42,
      "screen gap 32": 42,
      "screen gap 48": 42,
    });
    expect(
      swept("row pitch", [1, 1.5, 1.71, 2, 2.3, 3], (rowPitch) => ({
        ...REFERENCE,
        rowPitch,
      })),
    ).toEqual({
      "row pitch 1": 42,
      "row pitch 1.5": 42,
      "row pitch 1.71": 42,
      "row pitch 2": 42,
      "row pitch 2.3": 42,
      "row pitch 3": 42,
    });
    expect(holding(SEPARABLE)).toBe(0);
  });

  it.each(BENCHMARK_AUDITORIUMS)(
    "keeps that ranking across a sweep of every weight and both modelled distances, in room %s",
    (showtime) => {
      expect(
        acrossTheSweep([benchmarkAuditorium(showtime)], sweptWeightings()),
      ).toEqual({
        points: 144,
        centreline: 144,
        outward: 144,
        offTargetRow: 0,
        offTargetRowWhereDepthLeads: 0,
      });
    },
  );
});
