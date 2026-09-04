import { describe, expect, it } from "vitest";
import { seatMapCaptures } from "../corpus/captures.js";
import type { CapturedSeatMap } from "../corpus/types.js";
import { type Seat, seatsFrom } from "../source/seat-map.js";
import {
  FETCHED_AT,
  depthsOf,
  extentOf,
  lateralsOf,
} from "./auditorium.fixtures.js";
import { type NormalisedPosition, normalised } from "./auditorium.js";

type Positioned = Seat & NormalisedPosition;

const AUDITORIUM_WHOSE_ROW_LETTERS_SKIP_ONE = "561462741";
const AUDITORIUM_WITH_NO_ROW_LETTERS = "561505814";
const NAMED_SEATS = [
  ["561230736", "L11"],
  ["561505814", "607"],
  ["561462741", "WC17"],
  ["561865199", "A21"],
  ["561562293", "F8"],
] as const;

const auditoriumOf = (body: CapturedSeatMap) => {
  const seats = seatsFrom(JSON.stringify(body), FETCHED_AT);
  if (seats === null)
    throw new Error(
      `the corpus seat map for showtime ${body.showtimeId} does not read`,
    );
  return normalised(seats);
};

const capturedAuditoriums = () =>
  [...seatMapCaptures.values()].map((capture) => auditoriumOf(capture.body));

const capturedAuditorium = (showtime: string) => {
  const capture = [...seatMapCaptures.values()].find(
    (entry) => entry.body.showtimeId === showtime,
  );
  if (capture === undefined)
    throw new Error(`the corpus holds no seat map for showtime ${showtime}`);
  return auditoriumOf(capture.body);
};

const positionOf = (auditorium: readonly Positioned[], id: string) => {
  const seat = auditorium.find((candidate) => candidate.id === id);
  return { depth: seat?.depth, lateral: seat?.lateral };
};

describe("the normalised Auditorium over the captured corpus", () => {
  it("counts a Seat's distance from the centreline in seat widths, over the same extent lateral uses", () => {
    expect(
      NAMED_SEATS.map(([showtime, id]) => [
        id,
        capturedAuditorium(showtime).find((seat) => seat.id === id)
          ?.seatsOffCentre,
      ]),
    ).toEqual([
      ["L11", -0.03264604810996329],
      ["607", -0.004306171843486634],
      ["WC17", -7.293109491097717],
      ["A21", -8.333333333333334],
      ["F8", -2.616702355460384],
    ]);
  });

  it("normalises every captured Auditorium from its own front row to its own back row", () => {
    const captured = capturedAuditoriums();

    expect(captured).toHaveLength(42);
    expect(
      captured.map((auditorium) => ({
        depth: extentOf(depthsOf(auditorium)),
        lateral: extentOf(lateralsOf(auditorium)),
      })),
    ).toEqual(captured.map(() => ({ depth: [0, 1], lateral: [-1, 1] })));
  });

  it("counts the rows of an Auditorium whose row letters skip one and whose seat numbers run backwards", () => {
    const auditorium = capturedAuditorium(
      AUDITORIUM_WHOSE_ROW_LETTERS_SKIP_ONE,
    );

    expect(auditorium).toHaveLength(294);
    expect(positionOf(auditorium, "H31").depth).toBe(7 / 9);
    expect(positionOf(auditorium, "J31").depth).toBe(8 / 9);
    expect(positionOf(auditorium, "K1").depth).toBe(1);
    expect(positionOf(auditorium, "WC17")).toEqual({
      depth: 4 / 9,
      lateral: -0.30074156722015627,
    });
    expect(positionOf(auditorium, "E18")).toEqual({
      depth: 4 / 9,
      lateral: -0.3838907492705009,
    });
    expect(positionOf(auditorium, "A30")).toEqual({
      depth: 0,
      lateral: -0.9349224541235676,
    });
    expect(positionOf(auditorium, "A1")).toEqual({
      depth: 0,
      lateral: 0.9349166730499355,
    });
  });

  it("normalises an Auditorium whose labels carry no letters at all", () => {
    const auditorium = capturedAuditorium(AUDITORIUM_WITH_NO_ROW_LETTERS);

    expect(auditorium).toHaveLength(155);
    expect(auditorium.every((seat) => /^\d+$/.test(seat.id))).toBe(true);
    expect(positionOf(auditorium, "101")).toEqual({ depth: 0, lateral: -1 });
    expect(positionOf(auditorium, "919")).toEqual({ depth: 1, lateral: 1 });
    expect(positionOf(auditorium, "501")).toEqual({
      depth: 0.5,
      lateral: -0.5998052030430885,
    });
    expect(positionOf(auditorium, "901")).toEqual({
      depth: 1,
      lateral: -0.7983589584092127,
    });
  });
});
