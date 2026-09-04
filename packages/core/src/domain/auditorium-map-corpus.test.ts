import { describe, expect, it } from "vitest";
import { seatMapCaptures } from "../corpus/captures.js";
import type { CapturedSeatMap } from "../corpus/types.js";
import { seatsFrom } from "../source/seat-map.js";
import {
  FETCHED_AT,
  ascending,
  lateralsOf,
} from "./auditorium-map.fixtures.js";
import { auditoriumMap } from "./auditorium-map.js";
import { seatGroupsIn } from "./seat-group.js";

const AUDITORIUM_WHOSE_ROW_INDEX_SKIPS_TWO = "561865199";
const AUDITORIUM_WHOSE_ROW_LETTERS_SKIP_ONE = "561462741";
const AUDITORIUM_NUMBERED_WITHOUT_LETTERS = "561609773";

const capturedSeatMaps = () =>
  [...seatMapCaptures.values()].map((capture) => capture.body);

const seatsOf = (body: CapturedSeatMap) => {
  const seats = seatsFrom(JSON.stringify(body), FETCHED_AT);
  if (seats === null)
    throw new Error(
      `the corpus seat map for showtime ${body.showtimeId} does not read`,
    );
  return seats;
};

const capturedSeatMap = (showtime: string) => {
  const body = capturedSeatMaps().find((map) => map.showtimeId === showtime);
  if (body === undefined)
    throw new Error(`the corpus holds no seat map for showtime ${showtime}`);
  return body;
};

describe("the Auditorium map over the captured corpus", () => {
  it("reads every captured Auditorium into contiguous rows of ordered Seats", () => {
    const captured = capturedSeatMaps().map((body) => ({
      seats: seatsOf(body),
      map: auditoriumMap(seatsOf(body), []),
    }));

    expect(captured).toHaveLength(42);
    expect(captured.map((auditorium) => auditorium.map.rows.length)).toEqual(
      captured.map(
        (auditorium) => new Set(auditorium.seats.map((seat) => seat.y)).size,
      ),
    );
    expect(
      captured.map((auditorium) =>
        auditorium.map.rows.map((row) => row.ordinalFromFront),
      ),
    ).toEqual(
      captured.map((auditorium) =>
        auditorium.map.rows.map((_, index) => index + 1),
      ),
    );
    expect(
      captured.map((auditorium) =>
        auditorium.map.rows
          .flatMap((row) => row.seats)
          .map((seat) => seat.id)
          .toSorted(),
      ),
    ).toEqual(
      captured.map((auditorium) =>
        auditorium.seats.map((seat) => seat.id).toSorted(),
      ),
    );
    expect(
      captured.map((auditorium) =>
        auditorium.map.rows.map((row) => lateralsOf(row.seats)),
      ),
    ).toEqual(
      captured.map((auditorium) =>
        auditorium.map.rows.map((row) => ascending(lateralsOf(row.seats))),
      ),
    );
  });

  it("numbers fourteen rows one to fourteen where the payload's own row index runs to sixteen", () => {
    const body = capturedSeatMap(AUDITORIUM_WHOSE_ROW_INDEX_SKIPS_TWO);
    const map = auditoriumMap(seatsOf(body), []);

    expect(Math.max(...body.seats.map((seat) => seat.row))).toBe(16);
    expect(map.rows.map((row) => row.ordinalFromFront)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
    ]);
    expect(map.rows.map((row) => row.label)).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "J",
      "K",
      "L",
      "M",
      "N",
      "P",
    ]);
  });

  it("leaves the six captured rows that agree on no prefix unlabelled", () => {
    const rows = capturedSeatMaps().flatMap(
      (body) => auditoriumMap(seatsOf(body), []).rows,
    );
    const unlabelled = rows.filter((row) => row.label === null);

    expect(rows).toHaveLength(376);
    expect(
      unlabelled
        .map((row) =>
          [
            ...new Set(row.seats.map((seat) => seat.id.replace(/\d+$/, ""))),
          ].toSorted(),
        )
        .toSorted((left, right) => left.join().localeCompare(right.join())),
    ).toEqual([
      ["B", "WC"],
      ["C", "WC"],
      ["D", "WC"],
      ["E", "WC"],
      ["J", "WC"],
      ["M", "WC"],
    ]);
  });

  it("tells every row of a captured Auditorium apart by its label", () => {
    const labelled = capturedSeatMaps().map((body) =>
      auditoriumMap(seatsOf(body), [])
        .rows.map((row) => row.label)
        .filter((label) => label !== null),
    );

    expect(labelled.map((labels) => new Set(labels).size)).toEqual(
      labelled.map((labels) => labels.length),
    );
    expect(labelled.flat()).toHaveLength(370);
  });

  it("labels an Auditorium that skips a row letter, and one numbered without letters at all", () => {
    const skipping = auditoriumMap(
      seatsOf(capturedSeatMap(AUDITORIUM_WHOSE_ROW_LETTERS_SKIP_ONE)),
      [],
    );
    const withoutLetters = auditoriumMap(
      seatsOf(capturedSeatMap(AUDITORIUM_NUMBERED_WITHOUT_LETTERS)),
      [],
    );

    expect(skipping.rows.map((row) => row.label)).toEqual([
      "A",
      "B",
      "C",
      "D",
      null,
      "F",
      "G",
      "H",
      "J",
      "K",
    ]);
    expect(withoutLetters.rows.map((row) => row.label)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
    ]);
  });

  it("records the gap after each Seat, in the three bands the corpus draws", () => {
    const captured = capturedSeatMaps().map((body) =>
      auditoriumMap(seatsOf(body), []),
    );
    const gaps = captured.flatMap((map) =>
      map.rows.flatMap((row) => row.gapAfter),
    );

    expect(gaps).toHaveLength(6395);
    expect(gaps.length).toBe(
      captured.reduce(
        (total, map) => total + map.seatCount - map.rows.length,
        0,
      ),
    );
    expect({
      contiguous: gaps.filter((gap) => gap === null).length,
      pods: gaps.filter((gap) => gap === "pod").length,
      aisles: gaps.filter((gap) => gap === "aisle").length,
    }).toEqual({ contiguous: 5766, pods: 462, aisles: 167 });
  });

  it("locates the recommended Seat Group where its Seats are drawn", () => {
    const located = capturedSeatMaps().flatMap((body) => {
      const seats = seatsOf(body);
      return seatGroupsIn(seats, { partySize: 3, accessibleSeating: false })
        .slice(0, 1)
        .flatMap((group) => {
          const map = auditoriumMap(seats, group.seats);
          const recommended = map.recommended;
          return recommended === null
            ? []
            : [
                {
                  row: recommended.row,
                  found: map.rows
                    .filter((_, index) => index === recommended.row)
                    .flatMap((row) =>
                      row.seats.filter((_, index) =>
                        recommended.seats.includes(index),
                      ),
                    )
                    .map((seat) => seat.id),
                  wanted: group.seats.map((seat) => seat.id),
                },
              ];
        });
    });

    expect(located).toHaveLength(42);
    expect(located.map((entry) => entry.found)).toEqual(
      located.map((entry) => entry.wanted),
    );
    expect(new Set(located.map((entry) => entry.row)).size).toBeGreaterThan(1);
  });

  it("recommends nothing when the Seat Group is not in this Auditorium", () => {
    const map = auditoriumMap(
      seatsOf(capturedSeatMap(AUDITORIUM_WHOSE_ROW_LETTERS_SKIP_ONE)),
      [],
    );

    expect(map.rows.length).toBeGreaterThan(1);
    expect(map.recommended).toBeNull();
  });

  it("counts the bookable Seats of the Auditorium and of every row", () => {
    const captured = capturedSeatMaps().map((body) =>
      auditoriumMap(seatsOf(body), []),
    );
    const skipping = auditoriumMap(
      seatsOf(capturedSeatMap(AUDITORIUM_WHOSE_ROW_INDEX_SKIPS_TWO)),
      [],
    );

    expect(skipping.seatCount).toBe(304);
    expect(skipping.bookableCount).toBe(25);
    expect(captured.map((map) => map.bookableCount)).toEqual(
      captured.map((map) =>
        map.rows.reduce((total, row) => total + row.bookableCount, 0),
      ),
    );
  });
});
