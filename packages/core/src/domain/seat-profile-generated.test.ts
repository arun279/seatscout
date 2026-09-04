import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { normalised } from "./auditorium.js";
import {
  type Auditorium,
  alone,
  auditoriums,
  drawn,
  judged,
  punishesTheFrontRowHarder,
  rowOf,
  rowsIn,
  SEPARABLE,
  scoreOf,
  sweptWeightings,
} from "./seat-profile.fixtures.js";
import { REFERENCE, type SeatProfile, scoringIn } from "./seat-profile.js";

const shapedRooms = (): readonly Auditorium[] => [
  drawn([rowOf(4), rowOf(6), rowOf(8)]),
  drawn([rowOf(8), rowOf(6), rowOf(4)]),
  drawn([rowOf(6), rowOf(6), rowOf(6)]),
  drawn([rowOf(6, -15), rowOf(6, 0), rowOf(6, 15)]),
  drawn([
    { ...rowOf(6), gap: 5 },
    { ...rowOf(7), gap: 90 },
    { ...rowOf(5), gap: 20 },
  ]),
  drawn([rowOf(6, 0, 4), rowOf(5, 0, 12), rowOf(7, 0, 9)]),
];

const sidesOf = (row: Auditorium) =>
  [
    row.filter((seat) => seat.seatsOffCentre > 0),
    row.filter((seat) => seat.seatsOffCentre < 0),
  ].filter((side) => side.length > 0);

const farEdgeOf = (side: Auditorium) => {
  const edge = Math.max(...side.map((seat) => Math.abs(seat.seatsOffCentre)));
  return side.filter((seat) => Math.abs(seat.seatsOffCentre) === edge);
};

const weightings = fc.constantFrom(...sweptWeightings());

const shapeOf = (rows: readonly Auditorium[]) => {
  const spreads = rows.map(
    (row) =>
      Math.max(...row.map((seat) => seat.lateral)) -
      Math.min(...row.map((seat) => seat.lateral)),
  );
  const front = Math.max(...spreads.slice(0, 1));
  const back = Math.max(...spreads.slice(-1));
  if (rows.length === 1) return "oneRow";
  if (back > front) return "widens";
  if (back < front) return "narrows";
  return "equal";
};

describe("the Seat Profile score over generated Auditoriums", () => {
  it("is the same score however the Seats arrived", () => {
    fc.assert(
      fc.property(
        auditoriums,
        fc.integer({ min: 1, max: 4 }),
        (seats, size) => {
          const room = normalised(seats);
          const group = room.slice(0, size);
          const shuffled = [...room].reverse();

          expect(
            scoreOf(shuffled, REFERENCE, {
              seats: [...group].reverse(),
              podDividers: 0,
            }),
          ).toBe(scoreOf(room, REFERENCE, { seats: group, podDividers: 0 }));
        },
      ),
      { numRuns: 300 },
    );
  });

  it("punishes the same lateral offset harder the nearer the screen, whether the room widens or narrows toward the back", () => {
    const shapes = { widens: 0, narrows: 0, equal: 0, oneRow: 0 };
    const outcomes = { held: 0, nothingToCompare: 0 };

    fc.assert(
      fc.property(auditoriums, weightings, (seats, weights) => {
        const room = normalised(seats);
        const held = punishesTheFrontRowHarder(room, {
          ...REFERENCE,
          ...weights,
        });
        shapes[shapeOf(rowsIn(room))] += 1;
        outcomes[held === null ? "nothingToCompare" : "held"] += 1;

        expect(held).not.toBe(false);
      }),
      { numRuns: 400 },
    );

    expect(shapes.widens).toBeGreaterThan(0);
    expect(shapes.narrows).toBeGreaterThan(0);
    expect(shapes.equal).toBeGreaterThan(0);
    expect(shapes.oneRow).toBeGreaterThan(0);
    expect(outcomes.held).toBeGreaterThan(0);
  });

  it("holds that in every shape of room, and once the rows stand at one distance the same score holds it in none", () => {
    const rooms = shapedRooms();
    const holding = (profile: SeatProfile) =>
      rooms.filter((room) => punishesTheFrontRowHarder(room, profile) === true)
        .length;

    expect({
      rooms: rooms.length,
      angular: holding(REFERENCE),
      separable: holding(SEPARABLE),
    }).toEqual({ rooms: 6, angular: 6, separable: 0 });
  });

  it("charges more for the same Seat the further it sits from the centreline of its row", () => {
    fc.assert(
      fc.property(auditoriums, weightings, (seats, weights) => {
        expect(
          judged(normalised(seats), {
            ...REFERENCE,
            ...weights,
            wallBandWeight: 0,
          }).fallingOutward,
        ).toBe(true);
      }),
      { numRuns: 300 },
    );
  });

  it("counts rows from the front, one to the room's own count, and reads the centreline off the room", () => {
    const shapes = { oneSeat: 0, manySeats: 0 };

    fc.assert(
      fc.property(auditoriums, (seats) => {
        const room = normalised(seats);
        const score = scoringIn(room, REFERENCE);
        const rows = rowsIn(room);

        if (room.length === 1) shapes.oneSeat += 1;
        else shapes.manySeats += 1;

        for (const [index, row] of rows.entries())
          for (const seat of row) {
            const { reasons } = score(alone(seat));

            expect(reasons.rowFromFront).toBe(index + 1);
            expect(reasons.rowCount).toBe(rows.length);
            expect(reasons.seatsOffCentre).toBe(seat.seatsOffCentre);
          }
      }),
      { numRuns: 300 },
    );

    expect(shapes.oneSeat).toBeGreaterThan(0);
    expect(shapes.manySeats).toBeGreaterThan(0);
  });

  it("puts the whole last row against a wall, and elsewhere only the Seats at the far edge of a side", () => {
    fc.assert(
      fc.property(auditoriums, (seats) => {
        const room = normalised(seats);
        const score = scoringIn(room, REFERENCE);
        const rows = rowsIn(room);
        const walled = (row: Auditorium) =>
          row.filter((seat) => score(alone(seat)).reasons.againstWall);

        for (const row of rows.slice(-1)) expect(walled(row)).toEqual(row);
        for (const row of rows.slice(0, -1)) {
          expect(
            walled(row.filter((seat) => seat.seatsOffCentre === 0)),
          ).toEqual([]);
          for (const side of sidesOf(row))
            expect(walled(side)).toEqual(farEdgeOf(side));
        }
      }),
      { numRuns: 300 },
    );
  });

  it("mirrors which Seats are against a wall when the Auditorium is drawn mirrored", () => {
    fc.assert(
      fc.property(
        auditoriums,
        fc.integer({ min: -500, max: 500 }),
        (seats, axis) => {
          const walled = (room: Auditorium) => {
            const score = scoringIn(room, REFERENCE);
            return room.map((seat) => score(alone(seat)).reasons.againstWall);
          };

          expect(
            walled(
              normalised(
                seats.map((seat) => ({
                  ...seat,
                  x: axis - seat.x - seat.width,
                })),
              ),
            ),
          ).toEqual(walled(normalised(seats)));
        },
      ),
      { numRuns: 300 },
    );
  });

  it("ranks the same Seats below themselves for every console they turn out to cross", () => {
    fc.assert(
      fc.property(
        auditoriums,
        fc.integer({ min: 1, max: 4 }),
        (seats, podDividers) => {
          const room = normalised(seats);
          const group = room.slice(0, 3);
          const of = (crossed: number) =>
            scoreOf(room, REFERENCE, { seats: group, podDividers: crossed });

          expect(of(podDividers)).toBeLessThan(of(podDividers - 1));
        },
      ),
      { numRuns: 300 },
    );
  });
});
